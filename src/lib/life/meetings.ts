import type { Env } from "@/lib/life/demo-mode";

export const MEETING_PROVIDERS = ["zoom", "google_meet"] as const;
export type MeetingProviderId = (typeof MEETING_PROVIDERS)[number];

export const MEETING_SOURCES = ["api", "instant", "pasted", "demo"] as const;
export type MeetingSource = (typeof MEETING_SOURCES)[number];

export const MEETING_TOPIC = "Life Booster visit";

export const INSTANT_MEETING_URLS: Record<MeetingProviderId, string> = {
  zoom: "https://zoom.us/start/videomeeting",
  google_meet: "https://meet.google.com/new",
};

const DURATIONS = [30, 60, 90, 120] as const;
type DurationMin = (typeof DURATIONS)[number];

const ALLOWED_KEYS = new Set(["provider", "startsAt", "durationMin", "pastedUrl"]);

export class MeetingRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeetingRequestError";
  }
}

export type MeetingRecord = {
  provider: MeetingProviderId;
  joinUrl: string;
  externalId: string;
  source: MeetingSource;
};

export type MeetingCredentials = {
  zoomAccountId?: string;
  zoomClientId?: string;
  zoomClientSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
  googleCalendarId?: string;
};

export type MeetingHttpRequest = {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
};

export type MeetingHttpResponse = { status: number; body: unknown };

export type MeetingHttp = (request: MeetingHttpRequest) => Promise<MeetingHttpResponse>;

export type CreateMeetingOptions = {
  demo?: boolean;
  credentials?: MeetingCredentials;
  http?: MeetingHttp;
  requestId?: string;
};

type ParsedMeetingInput = {
  provider: MeetingProviderId;
  startsAt: string;
  durationMin: DurationMin;
  pastedUrl?: string;
};

export interface MeetingProvider {
  readonly id: MeetingProviderId;
  configured(credentials: MeetingCredentials): boolean;
  create(
    input: ParsedMeetingInput,
    credentials: MeetingCredentials,
    http: MeetingHttp,
    requestId: string,
  ): Promise<MeetingRecord>;
}

export function meetingProviderLabel(provider: MeetingProviderId): string {
  return provider === "zoom" ? "Zoom" : "Google Meet";
}

export function meetingSourceLabel(source: MeetingSource): string {
  if (source === "api") return "Created for this visit";
  if (source === "instant") return "Instant meeting link";
  if (source === "pasted") return "Link you pasted";
  return "Practice link";
}

export function normalizeProvider(value: unknown): MeetingProviderId {
  return value === "zoom" || value === "google_meet" ? value : "google_meet";
}

export function meetingFromRow(
  row: {
    meeting_provider?: unknown;
    meeting_url?: unknown;
    meeting_external_id?: unknown;
    meeting_source?: unknown;
  } | null,
): MeetingRecord | null {
  if (!row || typeof row.meeting_url !== "string" || !row.meeting_url) return null;
  if (row.meeting_provider !== "zoom" && row.meeting_provider !== "google_meet") return null;
  if (
    row.meeting_source !== "api" &&
    row.meeting_source !== "instant" &&
    row.meeting_source !== "pasted" &&
    row.meeting_source !== "demo"
  ) {
    return null;
  }
  return {
    provider: row.meeting_provider,
    joinUrl: row.meeting_url,
    externalId: typeof row.meeting_external_id === "string" ? row.meeting_external_id : "",
    source: row.meeting_source,
  };
}

function readEnv(env: Env, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** Reads provider credentials from an env map. Values are never logged. */
export function readMeetingCredentials(env: Env): MeetingCredentials {
  const out: MeetingCredentials = {};
  const assign = (field: keyof MeetingCredentials, key: string) => {
    const value = readEnv(env, key);
    if (value) out[field] = value;
  };
  assign("zoomAccountId", "ZOOM_ACCOUNT_ID");
  assign("zoomClientId", "ZOOM_CLIENT_ID");
  assign("zoomClientSecret", "ZOOM_CLIENT_SECRET");
  assign("googleClientId", "GOOGLE_CLIENT_ID");
  assign("googleClientSecret", "GOOGLE_CLIENT_SECRET");
  assign("googleRefreshToken", "GOOGLE_REFRESH_TOKEN");
  assign("googleCalendarId", "GOOGLE_CALENDAR_ID");
  return out;
}

export function zoomConfigured(credentials: MeetingCredentials): boolean {
  return Boolean(
    credentials.zoomAccountId && credentials.zoomClientId && credentials.zoomClientSecret,
  );
}

export function googleConfigured(credentials: MeetingCredentials): boolean {
  return Boolean(
    credentials.googleClientId && credentials.googleClientSecret && credentials.googleRefreshToken,
  );
}

export function providerConfigured(
  provider: MeetingProviderId,
  credentials: MeetingCredentials,
): boolean {
  return provider === "zoom" ? zoomConfigured(credentials) : googleConfigured(credentials);
}

function stamp(startsAt: string): string {
  return startsAt.replace(/[-:]/g, "").replace(".000Z", "Z");
}

function demoMeeting(input: ParsedMeetingInput): MeetingRecord {
  const id = stamp(input.startsAt);
  if (input.provider === "zoom") {
    return {
      provider: "zoom",
      joinUrl: `https://zoom.us/j/demo${id}`,
      externalId: `demo-zoom-${id}`,
      source: "demo",
    };
  }
  return {
    provider: "google_meet",
    joinUrl: `https://meet.google.com/demo-${id.toLowerCase()}`,
    externalId: `demo-google-${id}`,
    source: "demo",
  };
}

function instantMeeting(input: ParsedMeetingInput): MeetingRecord {
  return {
    provider: input.provider,
    joinUrl: INSTANT_MEETING_URLS[input.provider],
    externalId: "",
    source: "instant",
  };
}

export function isAllowedMeetingUrl(provider: MeetingProviderId, value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.pathname === "/" || url.pathname === "") return false;
  const host = url.hostname.toLowerCase();
  if (provider === "zoom") return host === "zoom.us" || host.endsWith(".zoom.us");
  return host === "meet.google.com";
}

function pastedMeeting(input: ParsedMeetingInput): MeetingRecord {
  const pasted = input.pastedUrl ?? "";
  if (!isAllowedMeetingUrl(input.provider, pasted)) {
    const label = meetingProviderLabel(input.provider);
    throw new MeetingRequestError(`Paste a full ${label} link, starting with https://.`);
  }
  return {
    provider: input.provider,
    joinUrl: pasted,
    externalId: "",
    source: "pasted",
  };
}

export function parseCreateMeetingInput(raw: unknown): ParsedMeetingInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new MeetingRequestError("The meeting request is not valid.");
  }
  const record = raw as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new MeetingRequestError("A meeting cannot include journal content.");
    }
  }
  if (record.provider !== "zoom" && record.provider !== "google_meet") {
    throw new MeetingRequestError("Choose Zoom or Google Meet.");
  }
  if (typeof record.startsAt !== "string") {
    throw new MeetingRequestError("That time is not valid.");
  }
  const when = new Date(record.startsAt);
  if (Number.isNaN(when.getTime())) throw new MeetingRequestError("That time is not valid.");
  const duration =
    typeof record.durationMin === "number" ? record.durationMin : Number(record.durationMin);
  if (!DURATIONS.includes(duration as DurationMin)) {
    throw new MeetingRequestError("Visits are 30, 60, 90, or 120 minutes.");
  }
  let pastedUrl: string | undefined;
  if (record.pastedUrl != null) {
    if (typeof record.pastedUrl !== "string") {
      throw new MeetingRequestError("The meeting request is not valid.");
    }
    const trimmed = record.pastedUrl.trim();
    if (trimmed) pastedUrl = trimmed;
  }
  return {
    provider: record.provider,
    startsAt: when.toISOString().replace(/\.\d{3}Z$/, "Z"),
    durationMin: duration as DurationMin,
    pastedUrl,
  };
}

export function zoomMeetingBody(input: Pick<ParsedMeetingInput, "startsAt" | "durationMin">) {
  return {
    topic: MEETING_TOPIC,
    type: 2,
    start_time: input.startsAt,
    duration: input.durationMin,
    timezone: "UTC",
    settings: {
      join_before_host: true,
      waiting_room: false,
    },
  };
}

export function googleCalendarEvent(
  input: Pick<ParsedMeetingInput, "startsAt" | "durationMin">,
  requestId: string,
) {
  const end = new Date(new Date(input.startsAt).getTime() + input.durationMin * 60_000);
  const endIso = end.toISOString().replace(/\.\d{3}Z$/, "Z");
  return {
    summary: MEETING_TOPIC,
    start: { dateTime: input.startsAt, timeZone: "UTC" },
    end: { dateTime: endIso, timeZone: "UTC" },
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };
}

async function post(http: MeetingHttp, request: MeetingHttpRequest): Promise<MeetingHttpResponse> {
  try {
    return await http(request);
  } catch {
    throw new MeetingRequestError("The meeting provider could not be reached.");
  }
}

function accessToken(response: MeetingHttpResponse, label: string): string {
  if (response.status < 200 || response.status >= 300) {
    throw new MeetingRequestError(
      `${label} could not authorize the meeting (HTTP ${response.status}).`,
    );
  }
  if (!response.body || typeof response.body !== "object") {
    throw new MeetingRequestError(`${label} could not authorize the meeting.`);
  }
  const token = (response.body as Record<string, unknown>).access_token;
  if (typeof token !== "string" || !token) {
    throw new MeetingRequestError(`${label} could not authorize the meeting.`);
  }
  return token;
}

function basicAuth(id: string, secret: string): string {
  try {
    return `Basic ${btoa(`${id}:${secret}`)}`;
  } catch {
    throw new MeetingRequestError("Zoom credentials could not be read.");
  }
}

function googleJoin(body: unknown): { joinUrl: string; externalId: string } | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const externalId = typeof record.id === "string" ? record.id : "";
  let entry = "";
  const conference = record.conferenceData;
  if (conference && typeof conference === "object") {
    const points = (conference as Record<string, unknown>).entryPoints;
    if (Array.isArray(points)) {
      for (const point of points) {
        if (!point || typeof point !== "object") continue;
        const item = point as Record<string, unknown>;
        if (item.entryPointType === "video" && typeof item.uri === "string" && item.uri) {
          entry = item.uri;
          break;
        }
      }
    }
  }
  const hangout = typeof record.hangoutLink === "string" ? record.hangoutLink : "";
  const joinUrl = entry || hangout;
  if (!joinUrl) return null;
  return { joinUrl, externalId };
}

const zoomProvider: MeetingProvider = {
  id: "zoom",
  configured: zoomConfigured,
  async create(input, credentials, http) {
    const tokenResponse = await post(http, {
      url: "https://zoom.us/oauth/token",
      method: "POST",
      headers: {
        Authorization: basicAuth(
          credentials.zoomClientId ?? "",
          credentials.zoomClientSecret ?? "",
        ),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "account_credentials",
        account_id: credentials.zoomAccountId ?? "",
      }).toString(),
    });
    const token = accessToken(tokenResponse, "Zoom");
    const created = await post(http, {
      url: "https://api.zoom.us/v2/users/me/meetings",
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(zoomMeetingBody(input)),
    });
    if (created.status < 200 || created.status >= 300) {
      throw new MeetingRequestError(`Zoom could not create the meeting (HTTP ${created.status}).`);
    }
    if (!created.body || typeof created.body !== "object") {
      throw new MeetingRequestError("Zoom did not return a join link.");
    }
    const record = created.body as Record<string, unknown>;
    const joinUrl = record.join_url;
    if (typeof joinUrl !== "string" || !joinUrl) {
      throw new MeetingRequestError("Zoom did not return a join link.");
    }
    const externalId =
      typeof record.id === "number" || typeof record.id === "string" ? String(record.id) : "";
    return { provider: "zoom", joinUrl, externalId, source: "api" };
  },
};

const googleMeetProvider: MeetingProvider = {
  id: "google_meet",
  configured: googleConfigured,
  async create(input, credentials, http, requestId) {
    const tokenResponse = await post(http, {
      url: "https://oauth2.googleapis.com/token",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: credentials.googleClientId ?? "",
        client_secret: credentials.googleClientSecret ?? "",
        refresh_token: credentials.googleRefreshToken ?? "",
      }).toString(),
    });
    const token = accessToken(tokenResponse, "Google");
    const calendarId = encodeURIComponent(credentials.googleCalendarId || "primary");
    const created = await post(http, {
      url: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(googleCalendarEvent(input, requestId)),
    });
    if (created.status < 200 || created.status >= 300) {
      throw new MeetingRequestError(
        `Google Meet could not create the meeting (HTTP ${created.status}).`,
      );
    }
    const join = googleJoin(created.body);
    if (!join) throw new MeetingRequestError("Google Meet did not return a join link.");
    return {
      provider: "google_meet",
      joinUrl: join.joinUrl,
      externalId: join.externalId,
      source: "api",
    };
  },
};

export const meetingProviders: Record<MeetingProviderId, MeetingProvider> = {
  zoom: zoomProvider,
  google_meet: googleMeetProvider,
};

/**
 * Common createMeeting entry. Zoom uses the Create Meeting API.
 * Google Meet uses Calendar `conferenceData` with `hangoutsMeet`.
 * Demo mode returns a practice link. Missing credentials fall back to an
 * instant link, or a link the caller pasted.
 */
export async function createMeeting(
  raw: unknown,
  options: CreateMeetingOptions = {},
): Promise<MeetingRecord> {
  const input = parseCreateMeetingInput(raw);
  if (options.demo) return demoMeeting(input);
  const credentials = options.credentials ?? {};
  const provider = meetingProviders[input.provider];
  if (provider.configured(credentials)) {
    const requestId = options.requestId ?? `lb-${crypto.randomUUID()}`;
    return provider.create(input, credentials, options.http ?? meetingFetch, requestId);
  }
  if (input.pastedUrl) return pastedMeeting(input);
  return instantMeeting(input);
}

export async function meetingFetch(request: MeetingHttpRequest): Promise<MeetingHttpResponse> {
  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: request.body,
    signal: AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  }
  return { status: response.status, body };
}
