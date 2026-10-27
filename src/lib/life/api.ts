import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { filterProfanity } from "@/lib/life/profanity";
import { sessionPriceCents, MIN_HOURLY_CENTS, MAX_HOURLY_CENTS } from "@/lib/life/money";
import { asIso, buildSlots, type Block } from "@/lib/life/time";
import type { CounselorCard, Dashboard, ReviewItem, SessionRoom, Visit } from "@/lib/life/types";

function tags(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function bool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

type CounselorRow = {
  user_id: string;
  display_name: string;
  headline: string;
  bio: string;
  religions: string;
  philosophies: string;
  specialties: string;
  hourly_rate_cents: number;
  timezone: string;
  standing: string;
};

function cardFrom(row: CounselorRow, rating: number, reviewCount: number): CounselorCard {
  return {
    id: row.user_id,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    religions: tags(row.religions),
    philosophies: tags(row.philosophies),
    specialties: tags(row.specialties),
    hourlyRateCents: num(row.hourly_rate_cents),
    timezone: row.timezone,
    standing: row.standing === "dismissed" ? "dismissed" : "active",
    sample: row.user_id.startsWith("sample-"),
    rating,
    reviewCount,
  };
}

async function loadDirectory(includeDismissed: boolean) {
  const sql = await getSql();
  const [rows, reviewRows, hourRows] = await Promise.all([
    sql<CounselorRow>`
      select user_id, display_name, headline, bio, religions, philosophies, specialties,
             hourly_rate_cents, timezone, standing
      from counselor_profiles
      order by display_name
    `,
    sql<{ counselor_id: string; stars: number }>`select counselor_id, stars from reviews`,
    sql<{ counselor_id: string }>`select distinct counselor_id from availability_blocks`,
  ]);
  const withHours = new Set(hourRows.map((row) => row.counselor_id));
  const stats = new Map<string, { sum: number; count: number }>();
  for (const review of reviewRows) {
    const current = stats.get(review.counselor_id) ?? { sum: 0, count: 0 };
    current.sum += num(review.stars);
    current.count += 1;
    stats.set(review.counselor_id, current);
  }
  return rows
    .filter((row) => includeDismissed || (row.standing === "active" && withHours.has(row.user_id)))
    .map((row) => {
      const stat = stats.get(row.user_id);
      const rating = stat && stat.count ? Math.round((stat.sum / stat.count) * 10) / 10 : 0;
      return cardFrom(row, rating, stat?.count ?? 0);
    });
}

const todaySchema = z.object({
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const listCounselors = createServerFn({ method: "GET" }).handler(async () => {
  return loadDirectory(false);
});

export const getCounselor = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => z.object({ id: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const cards = await loadDirectory(true);
    const counselor = cards.find((item) => item.id === data.id);
    if (!counselor || counselor.standing !== "active") return null;
    const sql = await getSql();
    const reviews = await sql<{
      id: number;
      stars: number;
      comment: string;
      reviewer_name: string;
      created_at: unknown;
    }>`
      select id, stars, comment, reviewer_name, created_at
      from reviews
      where counselor_id = ${data.id}
      order by created_at desc
      limit 40
    `;
    const items: ReviewItem[] = reviews.map((row) => ({
      id: num(row.id),
      stars: num(row.stars),
      comment: row.comment,
      reviewerName: row.reviewer_name,
      createdAt: asIso(row.created_at),
    }));
    return { counselor, reviews: items };
  });

const slotsSchema = z.object({
  counselorId: z.string().min(1).max(80),
  durationMin: z.union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)]),
});

export const listSlots = createServerFn({ method: "GET" })
  .validator((input: { counselorId: string; durationMin: number }) => slotsSchema.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const profiles = await sql<{ timezone: string; standing: string }>`
      select timezone, standing from counselor_profiles where user_id = ${data.counselorId}
    `;
    const profile = profiles[0];
    if (!profile || profile.standing !== "active") return [];
    const [blocks, busy] = await Promise.all([
      sql<{ weekday: number; start_min: number; end_min: number }>`
        select weekday, start_min, end_min from availability_blocks where counselor_id = ${data.counselorId}
      `,
      sql<{ starts_at: unknown; duration_min: number }>`
        select starts_at, duration_min from appointments
        where counselor_id = ${data.counselorId}
          and status = 'booked'
          and starts_at > now() - interval '1 day'
      `,
    ]);
    const open: Block[] = blocks.map((row) => ({
      weekday: num(row.weekday),
      startMin: num(row.start_min),
      endMin: num(row.end_min),
    }));
    return buildSlots({
      blocks: open,
      busy: busy.map((row) => ({ startsAt: asIso(row.starts_at), durationMin: num(row.duration_min) })),
      durationMin: data.durationMin,
      timeZone: profile.timezone || "America/New_York",
    });
  });

async function ensureProfile(userId: string, suggestedName: string) {
  const sql = await getSql();
  const name = suggestedName.trim().slice(0, 80);
  const rows = await sql<{ user_id: string; display_name: string; is_operator: boolean }>`
    insert into profiles (user_id, display_name)
    values (${userId}, ${name})
    on conflict (user_id) do update
      set display_name = case
        when profiles.display_name = '' then excluded.display_name
        else profiles.display_name
      end
    returning user_id, display_name, is_operator
  `;
  return rows[0];
}

export const getDashboard = createServerFn({ method: "GET" })
  .validator((input: { today: string; suggestedName?: string }) =>
    todaySchema
      .extend({ suggestedName: z.string().max(80).optional() })
      .parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }): Promise<Dashboard> => {
    const profile = await ensureProfile(context.userId, data.suggestedName ?? "");
    const sql = await getSql();
    const start = shiftDate(data.today, -6);
    const [moods, counselorRows, hourRows, deskRows, upcomingMember, upcomingHost] = await Promise.all([
      sql<{ logged_on: string; mood: number; note: string; share_with_counselors: boolean }>`
        select logged_on::text as logged_on, mood, note, share_with_counselors
        from mood_entries
        where user_id = ${context.userId}
          and logged_on >= ${start}::date
          and logged_on <= ${data.today}::date
        order by logged_on
      `,
      sql<{ headline: string; hourly_rate_cents: number; standing: string }>`
        select headline, hourly_rate_cents, standing
        from counselor_profiles where user_id = ${context.userId}
      `,
      sql<{ n: number }>`
        select count(*) as n from availability_blocks where counselor_id = ${context.userId}
      `,
      sql<{ n: number }>`select count(*) as n from profiles where is_operator = true`,
      sql<VisitRow>`
        select a.id, c.display_name as other_name, a.counselor_id as other_id, a.starts_at,
               a.duration_min, a.amount_cents, a.hourly_rate_cents, a.pay_method, a.pay_status,
               a.status, a.share_mood, a.ads_discount
        from appointments a
        join counselor_profiles c on c.user_id = a.counselor_id
        where a.member_id = ${context.userId}
          and a.status = 'booked'
          and a.starts_at > now() - interval '30 minutes'
        order by a.starts_at
        limit 1
      `,
      sql<VisitRow>`
        select a.id, coalesce(p.display_name, 'Member') as other_name, a.member_id as other_id, a.starts_at,
               a.duration_min, a.amount_cents, a.hourly_rate_cents, a.pay_method, a.pay_status,
               a.status, a.share_mood, a.ads_discount
        from appointments a
        left join profiles p on p.user_id = a.member_id
        where a.counselor_id = ${context.userId}
          and a.status = 'booked'
          and a.starts_at > now() - interval '30 minutes'
        order by a.starts_at
        limit 1
      `,
    ]);
    const counselor = counselorRows[0];
    const next = pickSooner(upcomingMember[0], upcomingHost[0], context.userId);
    return {
      profile: {
        displayName: profile?.display_name ?? "",
        isOperator: bool(profile?.is_operator),
        deskClaimed: num(deskRows[0]?.n) > 0,
      },
      counselor: counselor
        ? {
            headline: counselor.headline,
            hourlyRateCents: num(counselor.hourly_rate_cents),
            standing: counselor.standing === "dismissed" ? "dismissed" : "active",
            hasHours: num(hourRows[0]?.n) > 0,
          }
        : null,
      moods: moods.map((row) => ({
        loggedOn: String(row.logged_on).slice(0, 10),
        mood: num(row.mood),
        note: row.note,
        shareWithCounselors: bool(row.share_with_counselors),
      })),
      upcoming: next,
    };
  });

type VisitRow = {
  id: number;
  other_name: string;
  other_id: string;
  starts_at: unknown;
  duration_min: number;
  amount_cents: number;
  hourly_rate_cents: number;
  pay_method: string;
  pay_status: string;
  status: string;
  share_mood: boolean;
  ads_discount: boolean;
};

function toVisit(row: VisitRow, role: "member" | "counselor", hasReview = false): Visit {
  return {
    id: num(row.id),
    role,
    otherName: row.other_name,
    otherId: row.other_id,
    startsAt: asIso(row.starts_at),
    durationMin: num(row.duration_min),
    amountCents: num(row.amount_cents),
    hourlyRateCents: num(row.hourly_rate_cents),
    payMethod: row.pay_method,
    payStatus: row.pay_status,
    status: row.status,
    shareMood: bool(row.share_mood),
    adsDiscount: bool(row.ads_discount),
    hasReview,
  };
}

function pickSooner(member: VisitRow | undefined, host: VisitRow | undefined, _userId: string): Visit | null {
  if (!member && !host) return null;
  if (member && !host) return toVisit(member, "member");
  if (host && !member) return toVisit(host, "counselor");
  if (!member || !host) return null;
  const memberMs = new Date(asIso(member.starts_at)).getTime();
  const hostMs = new Date(asIso(host.starts_at)).getTime();
  return memberMs <= hostMs ? toVisit(member, "member") : toVisit(host, "counselor");
}

function shiftDate(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

const moodSchema = z.object({
  loggedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.number().int().min(1).max(5),
  note: z.string().max(1000),
  share: z.boolean(),
});

export const saveMood = createServerFn({ method: "POST" })
  .validator((input: z.infer<typeof moodSchema>) => moodSchema.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const earliest = shiftDate(data.today, -7);
    const latest = shiftDate(data.today, 1);
    if (data.loggedOn < earliest || data.loggedOn > latest) {
      throw new Error("You can log a mood for this week only.");
    }
    const sql = await getSql();
    await sql`
      insert into mood_entries (user_id, logged_on, mood, note, share_with_counselors)
      values (${context.userId}, ${data.loggedOn}::date, ${data.mood}, ${data.note.trim()}, ${data.share})
      on conflict (user_id, logged_on) do update
        set mood = excluded.mood,
            note = excluded.note,
            share_with_counselors = excluded.share_with_counselors
    `;
    return { ok: true as const };
  });

const nameSchema = z.object({ displayName: z.string().trim().min(1).max(80) });

export const saveDisplayName = createServerFn({ method: "POST" })
  .validator((input: { displayName: string }) => nameSchema.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    await ensureProfile(context.userId, data.displayName);
    await sql`update profiles set display_name = ${data.displayName} where user_id = ${context.userId}`;
    return { ok: true as const };
  });

const tagList = z.array(z.string().trim().min(1).max(40)).max(8);

const bioSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  headline: z.string().trim().min(1).max(120),
  bio: z.string().trim().min(1).max(2000),
  religions: tagList,
  philosophies: tagList,
  specialties: tagList,
  hourlyDollars: z.number().min(15).max(400),
  timezone: z.string().trim().min(1).max(80),
});

function cleanTags(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const text = filterProfanity(raw, true).text.replace(/[^\p{L}\p{N}&,'’\- ]/gu, "").trim();
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
  }
  return out;
}

export const saveCounselorBio = createServerFn({ method: "POST" })
  .validator((input: z.infer<typeof bioSchema>) => bioSchema.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const religions = cleanTags(data.religions);
    const philosophies = cleanTags(data.philosophies);
    const specialties = cleanTags(data.specialties);
    if (!religions.length || !philosophies.length || !specialties.length) {
      throw new Error("Add at least one religion, one philosophy, and one specialty.");
    }
    const cents = Math.round(data.hourlyDollars * 100);
    if (cents < MIN_HOURLY_CENTS || cents > MAX_HOURLY_CENTS) {
      throw new Error("Set an hourly rate between $15 and $400.");
    }
    try {
      Intl.DateTimeFormat(undefined, { timeZone: data.timezone });
    } catch {
      throw new Error("That timezone is not recognized.");
    }
    const sql = await getSql();
    await ensureProfile(context.userId, data.displayName);
    await sql`update profiles set display_name = ${data.displayName} where user_id = ${context.userId}`;
    await sql`
      insert into counselor_profiles (
        user_id, display_name, headline, bio, religions, philosophies, specialties,
        hourly_rate_cents, timezone
      ) values (
        ${context.userId}, ${data.displayName}, ${data.headline}, ${data.bio},
        ${JSON.stringify(religions)}, ${JSON.stringify(philosophies)}, ${JSON.stringify(specialties)},
        ${cents}, ${data.timezone}
      )
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        headline = excluded.headline,
        bio = excluded.bio,
        religions = excluded.religions,
        philosophies = excluded.philosophies,
        specialties = excluded.specialties,
        hourly_rate_cents = excluded.hourly_rate_cents,
        timezone = excluded.timezone
    `;
    return { ok: true as const };
  });

export const getMyCounselor = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<CounselorRow>`
      select user_id, display_name, headline, bio, religions, philosophies, specialties,
             hourly_rate_cents, timezone, standing
      from counselor_profiles where user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) return null;
    const blocks = await sql<{ weekday: number; start_min: number; end_min: number }>`
      select weekday, start_min, end_min
      from availability_blocks
      where counselor_id = ${context.userId}
      order by weekday, start_min
    `;
    return {
      ...cardFrom(row, 0, 0),
      blocks: blocks.map((block) => ({
        weekday: num(block.weekday),
        startMin: num(block.start_min),
        endMin: num(block.end_min),
      })),
    };
  });

const blocksSchema = z.object({
  blocks: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        startMin: z.number().int().min(0).max(1410),
        endMin: z.number().int().min(30).max(1440),
      }),
    )
    .max(21),
});

export const saveAvailability = createServerFn({ method: "POST" })
  .validator((input: z.infer<typeof blocksSchema>) => blocksSchema.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const mine = await sql<{ standing: string }>`
      select standing from counselor_profiles where user_id = ${context.userId}
    `;
    if (!mine[0]) throw new Error("Write your bio before setting hours.");
    if (mine[0].standing === "dismissed") {
      throw new Error("This profile was dismissed. New hours cannot be opened.");
    }
    const seen = new Set<string>();
    const clean = data.blocks.filter((block) => {
      if (block.endMin <= block.startMin || block.startMin % 30 !== 0 || block.endMin % 30 !== 0) return false;
      const key = `${block.weekday}:${block.startMin}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const perDay = new Map<number, number>();
    for (const block of clean) perDay.set(block.weekday, (perDay.get(block.weekday) ?? 0) + 1);
    if ([...perDay.values()].some((count) => count > 3)) {
      throw new Error("Keep it to three windows a day.");
    }
    await sql`delete from availability_blocks where counselor_id = ${context.userId}`;
    for (const block of clean) {
      await sql`
        insert into availability_blocks (counselor_id, weekday, start_min, end_min)
        values (${context.userId}, ${block.weekday}, ${block.startMin}, ${block.endMin})
      `;
    }
    return { ok: true as const };
  });

const bookSchema = z.object({
  counselorId: z.string().min(1).max(80),
  startsAt: z.string().min(10).max(40),
  durationMin: z.union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)]),
  shareMood: z.boolean(),
  adsOptIn: z.boolean(),
  disclaimerAck: z.literal(true),
  payMethod: z.enum(["apple_pay", "google_pay"]),
  payStatus: z.enum(["authorized", "demo_authorized"]),
});

export const bookAppointment = createServerFn({ method: "POST" })
  .validator((input: z.infer<typeof bookSchema>) => bookSchema.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    if (!data.disclaimerAck) throw new Error("Please acknowledge the disclaimer.");
    if (data.counselorId === context.userId) throw new Error("You cannot book yourself.");
    const when = new Date(data.startsAt);
    if (Number.isNaN(when.getTime())) throw new Error("That time is not valid.");
    const sql = await getSql();
    const profiles = await sql<{
      hourly_rate_cents: number;
      timezone: string;
      standing: string;
      display_name: string;
    }>`
      select hourly_rate_cents, timezone, standing, display_name
      from counselor_profiles where user_id = ${data.counselorId}
    `;
    const profile = profiles[0];
    if (!profile || profile.standing !== "active") throw new Error("That counselor is not available.");
    const blocks = await sql<{ weekday: number; start_min: number; end_min: number }>`
      select weekday, start_min, end_min from availability_blocks where counselor_id = ${data.counselorId}
    `;
    const busy = await sql<{ starts_at: unknown; duration_min: number }>`
      select starts_at, duration_min from appointments
      where counselor_id = ${data.counselorId} and status = 'booked' and starts_at > now() - interval '1 day'
    `;
    const slots = buildSlots({
      blocks: blocks.map((block) => ({
        weekday: num(block.weekday),
        startMin: num(block.start_min),
        endMin: num(block.end_min),
      })),
      busy: busy.map((row) => ({ startsAt: asIso(row.starts_at), durationMin: num(row.duration_min) })),
      durationMin: data.durationMin,
      timeZone: profile.timezone || "America/New_York",
    });
    const wanted = when.toISOString();
    const open = slots.some((day) => day.slots.includes(wanted));
    if (!open) throw new Error("That time was just taken. Pick another.");
    const hourly = num(profile.hourly_rate_cents);
    const amount = sessionPriceCents(hourly, data.durationMin, data.adsOptIn);
    const inserted = await sql<{ id: number }>`
      insert into appointments (
        member_id, counselor_id, starts_at, duration_min, hourly_rate_cents,
        ads_discount, amount_cents, pay_method, pay_status, share_mood, status, disclaimer_ack
      ) values (
        ${context.userId}, ${data.counselorId}, ${wanted}::timestamptz, ${data.durationMin}, ${hourly},
        ${data.adsOptIn}, ${amount}, ${data.payMethod}, ${data.payStatus}, ${data.shareMood}, 'booked', true
      )
      returning id
    `;
    return {
      id: num(inserted[0]?.id),
      amountCents: amount,
      counselorName: profile.display_name,
    };
  });

export const listVisits = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const [asMember, asHost, reviewed] = await Promise.all([
      sql<VisitRow>`
        select a.id, c.display_name as other_name, a.counselor_id as other_id, a.starts_at,
               a.duration_min, a.amount_cents, a.hourly_rate_cents, a.pay_method, a.pay_status,
               a.status, a.share_mood, a.ads_discount
        from appointments a
        join counselor_profiles c on c.user_id = a.counselor_id
        where a.member_id = ${context.userId}
        order by a.starts_at desc
        limit 40
      `,
      sql<VisitRow>`
        select a.id, coalesce(p.display_name, 'Member') as other_name, a.member_id as other_id, a.starts_at,
               a.duration_min, a.amount_cents, a.hourly_rate_cents, a.pay_method, a.pay_status,
               a.status, a.share_mood, a.ads_discount
        from appointments a
        left join profiles p on p.user_id = a.member_id
        where a.counselor_id = ${context.userId}
        order by a.starts_at desc
        limit 40
      `,
      sql<{ appointment_id: number }>`
        select appointment_id from reviews where member_id = ${context.userId}
      `,
    ]);
    const reviewedIds = new Set(reviewed.map((row) => num(row.appointment_id)));
    const visits = [
      ...asMember.map((row) => toVisit(row, "member", reviewedIds.has(num(row.id)))),
      ...asHost.map((row) => toVisit(row, "counselor", false)),
    ];
    visits.sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1));
    return visits;
  });

export const getSessionRoom = createServerFn({ method: "GET" })
  .validator((input: { id: number }) => z.object({ id: z.number().int().positive() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }): Promise<SessionRoom> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      member_id: string;
      counselor_id: string;
      starts_at: unknown;
      duration_min: number;
      status: string;
      share_mood: boolean;
      counselor_name: string;
      member_name: string | null;
    }>`
      select a.id, a.member_id, a.counselor_id, a.starts_at, a.duration_min, a.status, a.share_mood,
             c.display_name as counselor_name, p.display_name as member_name
      from appointments a
      join counselor_profiles c on c.user_id = a.counselor_id
      left join profiles p on p.user_id = a.member_id
      where a.id = ${data.id}
        and (a.member_id = ${context.userId} or a.counselor_id = ${context.userId})
    `;
    const row = rows[0];
    if (!row) throw new Error("That visit is not on your calendar.");
    const sample = row.counselor_id.startsWith("sample-");
    const role: SessionRoom["role"] =
      row.counselor_id === context.userId ? "counselor" : sample ? "solo" : "member";
    let notes: SessionRoom["notes"] = [];
    if (bool(row.share_mood)) {
      const shared = await sql<{ logged_on: string; mood: number; note: string }>`
        select logged_on::text as logged_on, mood, note
        from mood_entries
        where user_id = ${row.member_id}
          and share_with_counselors = true
          and note <> ''
          and logged_on >= (${asIso(row.starts_at)}::timestamptz::date - 13)
          and logged_on <= ${asIso(row.starts_at)}::timestamptz::date
        order by logged_on
      `;
      notes = shared.map((item) => ({
        loggedOn: String(item.logged_on).slice(0, 10),
        mood: num(item.mood),
        note: item.note,
      }));
    }
    return {
      id: num(row.id),
      role,
      startsAt: asIso(row.starts_at),
      durationMin: num(row.duration_min),
      status: row.status,
      shareMood: bool(row.share_mood),
      otherName: role === "counselor" ? row.member_name || "Member" : row.counselor_name,
      counselorName: row.counselor_name,
      sample,
      notes,
    };
  });

export const listMessages = createServerFn({ method: "GET" })
  .validator((input: { id: number }) => z.object({ id: z.number().int().positive() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const allowed = await sql<{ id: number }>`
      select id from appointments
      where id = ${data.id} and (member_id = ${context.userId} or counselor_id = ${context.userId})
    `;
    if (!allowed[0]) return [];
    const rows = await sql<{ id: number; sender_id: string; body: string; created_at: unknown }>`
      select id, sender_id, body, created_at
      from session_messages
      where appointment_id = ${data.id}
      order by id
      limit 200
    `;
    return rows.map((row) => ({
      id: num(row.id),
      mine: row.sender_id === context.userId,
      body: row.body,
      createdAt: asIso(row.created_at),
    }));
  });

export const postMessage = createServerFn({ method: "POST" })
  .validator((input: { id: number; body: string }) =>
    z.object({ id: z.number().int().positive(), body: z.string().trim().min(1).max(1000) }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const allowed = await sql<{ status: string }>`
      select status from appointments
      where id = ${data.id} and (member_id = ${context.userId} or counselor_id = ${context.userId})
    `;
    if (!allowed[0] || allowed[0].status === "cancelled") throw new Error("This visit is closed.");
    await sql`
      insert into session_messages (appointment_id, sender_id, body)
      values (${data.id}, ${context.userId}, ${data.body})
    `;
    return { ok: true as const };
  });

const signalSchema = z.object({
  id: z.number().int().positive(),
  kind: z.enum(["offer", "answer", "ice"]),
  payload: z.string().min(2).max(20000),
});

async function assertParticipant(appointmentId: number, userId: string) {
  const sql = await getSql();
  const rows = await sql<{ status: string }>`
    select status from appointments
    where id = ${appointmentId} and (member_id = ${userId} or counselor_id = ${userId})
  `;
  if (!rows[0] || rows[0].status === "cancelled") throw new Error("This visit is closed.");
}

export const postSignal = createServerFn({ method: "POST" })
  .validator((input: z.infer<typeof signalSchema>) => signalSchema.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await assertParticipant(data.id, context.userId);
    const sql = await getSql();
    await sql`
      insert into call_signals (appointment_id, sender_id, kind, payload)
      values (${data.id}, ${context.userId}, ${data.kind}, ${data.payload})
    `;
    return { ok: true as const };
  });

export const listSignals = createServerFn({ method: "GET" })
  .validator((input: { id: number; afterId: number }) =>
    z.object({ id: z.number().int().positive(), afterId: z.number().int().min(0) }).parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await assertParticipant(data.id, context.userId);
    const sql = await getSql();
    const rows = await sql<{ id: number; kind: string; payload: string }>`
      select id, kind, payload from call_signals
      where appointment_id = ${data.id}
        and id > ${data.afterId}
        and sender_id <> ${context.userId}
      order by id
      limit 50
    `;
    return rows.map((row) => ({ id: num(row.id), kind: row.kind as "offer" | "answer" | "ice", payload: row.payload }));
  });

export const touchPresence = createServerFn({ method: "POST" })
  .validator((input: { id: number }) => z.object({ id: z.number().int().positive() }).parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await assertParticipant(data.id, context.userId);
    const sql = await getSql();
    await sql`
      insert into call_presence (appointment_id, user_id, updated_at)
      values (${data.id}, ${context.userId}, now())
      on conflict (appointment_id, user_id) do update set updated_at = now()
    `;
    const peers = await sql<{ n: number }>`
      select count(*) as n from call_presence
      where appointment_id = ${data.id}
        and user_id <> ${context.userId}
        and updated_at > now() - interval '20 seconds'
    `;
    return { peer: num(peers[0]?.n) > 0 };
  });

const reviewSchema = z.object({
  appointmentId: z.number().int().positive(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(600),
});

export const submitReview = createServerFn({ method: "POST" })
  .validator((input: z.infer<typeof reviewSchema>) => reviewSchema.parse(input))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const filtered = filterProfanity(data.comment.trim(), true).text;
    const sql = await getSql();
    const rows = await sql<{ counselor_id: string; status: string }>`
      select counselor_id, status from appointments
      where id = ${data.appointmentId} and member_id = ${context.userId}
    `;
    const appointment = rows[0];
    if (!appointment || appointment.status === "cancelled") {
      throw new Error("You can review a visit you booked that was not cancelled.");
    }
    const names = await sql<{ display_name: string }>`
      select display_name from profiles where user_id = ${context.userId}
    `;
    const reviewer = (names[0]?.display_name || "Member").slice(0, 80);
    try {
      await sql`
        insert into reviews (appointment_id, member_id, counselor_id, stars, comment, reviewer_name)
        values (
          ${data.appointmentId}, ${context.userId}, ${appointment.counselor_id},
          ${data.stars}, ${filtered}, ${reviewer}
        )
      `;
    } catch {
      throw new Error("You already left a note for this visit.");
    }
    return { comment: filtered };
  });

async function requireOperator(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ is_operator: boolean }>`
    select is_operator from profiles where user_id = ${userId}
  `;
  if (!bool(rows[0]?.is_operator)) throw new Error("Only the Life Booster desk can do that.");
}

export const claimDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureProfile(context.userId, "");
    const updated = await sql<{ user_id: string }>`
      update profiles set is_operator = true
      where user_id = ${context.userId}
        and not exists (select 1 from profiles where is_operator = true)
      returning user_id
    `;
    if (!updated[0]) throw new Error("The desk already has an operator.");
    return { ok: true as const };
  });

export const listDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireOperator(context.userId);
    return loadDirectory(true);
  });

export const setCounselorStanding = createServerFn({ method: "POST" })
  .validator((input: { id: string; standing: "active" | "dismissed" }) =>
    z
      .object({
        id: z.string().min(1).max(80),
        standing: z.enum(["active", "dismissed"]),
      })
      .parse(input),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await requireOperator(context.userId);
    if (data.id === context.userId && data.standing === "dismissed") {
      throw new Error("You cannot dismiss your own desk profile this way.");
    }
    const sql = await getSql();
    const dismissedAt = data.standing === "dismissed" ? new Date().toISOString() : null;
    const rows = await sql<{ user_id: string }>`
      update counselor_profiles
      set standing = ${data.standing},
          dismissed_at = ${dismissedAt}::timestamptz
      where user_id = ${data.id}
      returning user_id
    `;
    if (!rows[0]) throw new Error("No counselor with that profile.");
    if (data.standing === "dismissed") {
      await sql`
        update appointments
        set status = 'cancelled'
        where counselor_id = ${data.id}
          and status = 'booked'
          and starts_at > now()
      `;
    }
    return { ok: true as const };
  });

