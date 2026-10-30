import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { resolveDemo } from "@/lib/life/demo-mode";
import {
  createMeeting,
  googleConfigured,
  meetingFromRow,
  normalizeProvider,
  readMeetingCredentials,
  zoomConfigured,
  type MeetingProviderId,
  type MeetingRecord,
} from "@/lib/life/meetings";
import { asIso } from "@/lib/life/time";

const providerSchema = z.enum(["zoom", "google_meet"]);

async function ensureProfileRow(userId: string) {
  const sql = await getSql();
  await sql`
    insert into profiles (user_id, display_name)
    values (${userId}, '')
    on conflict (user_id) do nothing
  `;
}

export const getMeetingSettings = createServerFn({ method: "GET" })
  .validator((input: { demo: boolean }) => z.object({ demo: z.boolean() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await ensureProfileRow(context.userId);
    const sql = await getSql();
    const rows = await sql<{ meeting_provider: string }>`
      select meeting_provider from profiles where user_id = ${context.userId}
    `;
    const credentials = readMeetingCredentials(process.env);
    return {
      provider: normalizeProvider(rows[0]?.meeting_provider),
      demo: resolveDemo(data.demo, process.env),
      zoomConfigured: zoomConfigured(credentials),
      googleConfigured: googleConfigured(credentials),
    };
  });

export const saveMeetingProvider = createServerFn({ method: "POST" })
  .validator((input: { provider: MeetingProviderId }) =>
    z.object({ provider: providerSchema }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await ensureProfileRow(context.userId);
    const sql = await getSql();
    await sql`
      update profiles set meeting_provider = ${data.provider} where user_id = ${context.userId}
    `;
    return { provider: data.provider };
  });

const createSchema = z.object({
  appointmentId: z.number().int().positive(),
  demo: z.boolean(),
  pastedUrl: z.string().max(2000).optional(),
});

type StoredMeeting = {
  provider: string;
  join_url: string;
  external_id: string;
  source: string;
};

function fromStored(row: StoredMeeting): MeetingRecord {
  const meeting = meetingFromRow({
    meeting_provider: row.provider,
    meeting_url: row.join_url,
    meeting_external_id: row.external_id,
    meeting_source: row.source,
  });
  if (!meeting) throw new Error("The saved meeting link is not valid.");
  return meeting;
}

export const createVisitMeeting = createServerFn({ method: "POST" })
  .validator((input: z.infer<typeof createSchema>) => createSchema.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }): Promise<MeetingRecord> => {
    const sql = await getSql();
    const visits = await sql<{ starts_at: unknown; duration_min: number }>`
      select starts_at, duration_min
      from appointments
      where id = ${data.appointmentId}
        and status <> 'cancelled'
        and (member_id = ${context.userId} or counselor_id = ${context.userId})
    `;
    const visit = visits[0];
    if (!visit) throw new Error("That visit is not on your calendar.");

    const existing = await sql<StoredMeeting>`
      select provider, join_url, external_id, source
      from visit_meetings
      where appointment_id = ${data.appointmentId}
    `;
    if (existing[0]) return fromStored(existing[0]);

    await ensureProfileRow(context.userId);
    const preference = await sql<{ meeting_provider: string }>`
      select meeting_provider from profiles where user_id = ${context.userId}
    `;
    const meeting = await createMeeting(
      {
        provider: normalizeProvider(preference[0]?.meeting_provider),
        startsAt: asIso(visit.starts_at),
        durationMin: visit.duration_min,
        pastedUrl: data.pastedUrl,
      },
      {
        demo: resolveDemo(data.demo, process.env),
        credentials: readMeetingCredentials(process.env),
      },
    );

    try {
      await sql`
        insert into visit_meetings (appointment_id, provider, join_url, external_id, source, created_by)
        values (
          ${data.appointmentId},
          ${meeting.provider},
          ${meeting.joinUrl},
          ${meeting.externalId},
          ${meeting.source},
          ${context.userId}
        )
        on conflict (appointment_id) do nothing
      `;
    } catch {
      const raced = await sql<StoredMeeting>`
        select provider, join_url, external_id, source
        from visit_meetings
        where appointment_id = ${data.appointmentId}
      `;
      if (raced[0]) return fromStored(raced[0]);
      throw new Error("Could not save the meeting link.");
    }

    const stored = await sql<StoredMeeting>`
      select provider, join_url, external_id, source
      from visit_meetings
      where appointment_id = ${data.appointmentId}
    `;
    if (!stored[0]) throw new Error("Could not save the meeting link.");
    return fromStored(stored[0]);
  });
