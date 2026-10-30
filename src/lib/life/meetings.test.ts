import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { demoFromEnv, isDemoMode, resolveDemo } from "./demo-mode.ts";
import {
  INSTANT_MEETING_URLS,
  MEETING_TOPIC,
  MeetingRequestError,
  createMeeting,
  googleCalendarEvent,
  isAllowedMeetingUrl,
  meetingFromRow,
  readMeetingCredentials,
  zoomMeetingBody,
  type MeetingHttp,
  type MeetingHttpRequest,
} from "./meetings.ts";

const START = "2026-11-02T15:00:00.000Z";
const ZOOM_SECRET = "zoom-secret-should-stay-out-of-errors";
const GOOGLE_SECRET = "google-secret-should-stay-out-of-errors";

const zoomCredentials = {
  zoomAccountId: "zoom-account",
  zoomClientId: "zoom-client",
  zoomClientSecret: ZOOM_SECRET,
};

const googleCredentials = {
  googleClientId: "google-client",
  googleClientSecret: GOOGLE_SECRET,
  googleRefreshToken: "google-refresh",
  googleCalendarId: "primary",
};

function baseInput(provider: "zoom" | "google_meet", extra?: Record<string, unknown>) {
  return { provider, startsAt: START, durationMin: 60, ...extra };
}

describe("demo mode", () => {
  it("turns on from the Vite flag, the server flag, or ?demo=1", () => {
    assert.equal(demoFromEnv({ VITE_LIFE_BOOSTER_DEMO: "1" }), true);
    assert.equal(demoFromEnv({ LIFE_BOOSTER_DEMO: "1" }), true);
    assert.equal(demoFromEnv({ VITE_LIFE_BOOSTER_DEMO: "0" }), false);
    assert.equal(isDemoMode("?demo=1"), true);
    assert.equal(isDemoMode("demo=1"), true);
    assert.equal(isDemoMode("?x=1&demo=1"), true);
    assert.equal(isDemoMode("?demo=0"), false);
    assert.equal(isDemoMode("", "1"), true);
    assert.equal(resolveDemo(false, { VITE_LIFE_BOOSTER_DEMO: "1" }), true);
    assert.equal(resolveDemo(true, {}), true);
    assert.equal(resolveDemo(false, {}), false);
  });
});

describe("readMeetingCredentials", () => {
  it("keeps trimmed env values and drops blanks", () => {
    assert.deepEqual(
      readMeetingCredentials({
        ZOOM_ACCOUNT_ID: "  ",
        ZOOM_CLIENT_ID: " zoom-id ",
        GOOGLE_CALENDAR_ID: "team",
      }),
      { zoomClientId: "zoom-id", googleCalendarId: "team" },
    );
  });
});

describe("createMeeting", () => {
  it("uses mocked providers in demo mode and does not call the network", async () => {
    let called = false;
    const http: MeetingHttp = async () => {
      called = true;
      return { status: 500, body: null };
    };
    const zoom = await createMeeting(baseInput("zoom"), {
      demo: true,
      credentials: zoomCredentials,
      http,
    });
    const meet = await createMeeting(baseInput("google_meet"), {
      demo: true,
      credentials: googleCredentials,
      http,
    });
    assert.equal(called, false);
    assert.equal(zoom.source, "demo");
    assert.equal(meet.source, "demo");
    assert.match(zoom.joinUrl, /^https:\/\/zoom\.us\/j\/demo/);
    assert.match(meet.joinUrl, /^https:\/\/meet\.google\.com\/demo-/);
  });

  it("falls back to instant links when credentials are missing", async () => {
    const http: MeetingHttp = async () => {
      throw new Error("network should not be called");
    };
    const zoom = await createMeeting(baseInput("zoom"), { credentials: {}, http });
    const meet = await createMeeting(baseInput("google_meet"), { credentials: {}, http });
    assert.equal(zoom.source, "instant");
    assert.equal(zoom.joinUrl, INSTANT_MEETING_URLS.zoom);
    assert.equal(meet.source, "instant");
    assert.equal(meet.joinUrl, INSTANT_MEETING_URLS.google_meet);
  });

  it("saves a pasted link when that provider is not configured", async () => {
    const pasted = "https://us02web.zoom.us/j/123456789?pwd=abc";
    const meeting = await createMeeting(baseInput("zoom", { pastedUrl: `  ${pasted}  ` }), {
      credentials: {},
    });
    assert.equal(meeting.source, "pasted");
    assert.equal(meeting.joinUrl, pasted);
  });

  it("rejects a pasted link for the wrong host", async () => {
    await assert.rejects(
      () =>
        createMeeting(baseInput("google_meet", { pastedUrl: "https://zoom.us/j/123" }), {
          credentials: {},
        }),
      (error: unknown) => {
        assert.ok(error instanceof MeetingRequestError);
        assert.match(error.message, /Google Meet/);
        assert.equal(error.message.includes("zoom.us/j/123"), false);
        return true;
      },
    );
    assert.equal(isAllowedMeetingUrl("zoom", "http://zoom.us/j/1"), false);
    assert.equal(isAllowedMeetingUrl("zoom", "https://zoom.us.evil.com/j/1"), false);
    assert.equal(isAllowedMeetingUrl("google_meet", "https://meet.google.com/abc-defg-hij"), true);
  });

  it("refuses journal fields before any provider call", async () => {
    let called = false;
    const http: MeetingHttp = async () => {
      called = true;
      return { status: 200, body: {} };
    };
    await assert.rejects(
      () =>
        createMeeting(
          { ...baseInput("zoom"), journal: "weekday plan" },
          { credentials: zoomCredentials, http },
        ),
      /journal content/,
    );
    assert.equal(called, false);
  });

  it("creates a Zoom meeting through the Create Meeting API", async () => {
    const calls: MeetingHttpRequest[] = [];
    const http: MeetingHttp = async (request) => {
      calls.push(request);
      if (request.url === "https://zoom.us/oauth/token") {
        const params = new URLSearchParams(request.body);
        assert.equal(params.get("grant_type"), "account_credentials");
        assert.equal(params.get("account_id"), "zoom-account");
        assert.match(request.headers.Authorization ?? "", /^Basic /);
        return { status: 200, body: { access_token: "zoom-token" } };
      }
      assert.equal(request.url, "https://api.zoom.us/v2/users/me/meetings");
      assert.equal(request.headers.Authorization, "Bearer zoom-token");
      const body = JSON.parse(request.body) as Record<string, unknown>;
      assert.deepEqual(
        body,
        zoomMeetingBody({ startsAt: "2026-11-02T15:00:00Z", durationMin: 60 }),
      );
      assert.equal(body.topic, MEETING_TOPIC);
      assert.equal("agenda" in body, false);
      assert.equal("journal" in body, false);
      return { status: 201, body: { id: 987, join_url: "https://zoom.us/j/987" } };
    };
    const meeting = await createMeeting(
      baseInput("zoom", { pastedUrl: "https://zoom.us/j/ignored" }),
      {
        credentials: zoomCredentials,
        http,
      },
    );
    assert.equal(calls.length, 2);
    assert.equal(meeting.source, "api");
    assert.equal(meeting.joinUrl, "https://zoom.us/j/987");
    assert.equal(meeting.externalId, "987");
  });

  it("creates a Google Meet through Calendar conferenceData", async () => {
    const http: MeetingHttp = async (request) => {
      if (request.url === "https://oauth2.googleapis.com/token") {
        const params = new URLSearchParams(request.body);
        assert.equal(params.get("grant_type"), "refresh_token");
        assert.equal(params.get("client_id"), "google-client");
        assert.equal(params.get("refresh_token"), "google-refresh");
        return { status: 200, body: { access_token: "ya29.token" } };
      }
      assert.equal(
        request.url,
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      );
      assert.equal(request.headers.Authorization, "Bearer ya29.token");
      const body = JSON.parse(request.body) as ReturnType<typeof googleCalendarEvent>;
      assert.equal(body.summary, MEETING_TOPIC);
      assert.equal(body.conferenceData.createRequest.conferenceSolutionKey.type, "hangoutsMeet");
      assert.equal(body.conferenceData.createRequest.requestId, "lb-test");
      assert.equal("description" in body, false);
      assert.deepEqual(Object.keys(body).sort(), ["conferenceData", "end", "start", "summary"]);
      return {
        status: 200,
        body: {
          id: "evt-1",
          hangoutLink: "https://meet.google.com/hangout-link",
          conferenceData: {
            entryPoints: [
              { entryPointType: "more" },
              { entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" },
            ],
          },
        },
      };
    };
    const meeting = await createMeeting(baseInput("google_meet"), {
      credentials: googleCredentials,
      http,
      requestId: "lb-test",
    });
    assert.equal(meeting.source, "api");
    assert.equal(meeting.joinUrl, "https://meet.google.com/abc-defg-hij");
    assert.equal(meeting.externalId, "evt-1");
  });

  it("keeps secrets and provider bodies out of error text", async () => {
    const logs: unknown[][] = [];
    const originals = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
    console.log = (...args: unknown[]) => logs.push(args);
    console.info = (...args: unknown[]) => logs.push(args);
    console.warn = (...args: unknown[]) => logs.push(args);
    console.error = (...args: unknown[]) => logs.push(args);
    console.debug = (...args: unknown[]) => logs.push(args);
    const http: MeetingHttp = async (request) => {
      if (request.url.includes("oauth"))
        return { status: 200, body: { access_token: "zoom-token" } };
      return { status: 401, body: { message: ZOOM_SECRET } };
    };
    try {
      await assert.rejects(
        () => createMeeting(baseInput("zoom"), { credentials: zoomCredentials, http }),
        (error: unknown) => {
          assert.ok(error instanceof MeetingRequestError);
          assert.equal(error.message.includes(ZOOM_SECRET), false);
          assert.match(error.message, /HTTP 401/);
          return true;
        },
      );
      assert.equal(logs.length, 0);
    } finally {
      console.log = originals.log;
      console.info = originals.info;
      console.warn = originals.warn;
      console.error = originals.error;
      console.debug = originals.debug;
    }
  });
});

describe("meetingFromRow", () => {
  it("reads a stored link and ignores empty rows", () => {
    assert.equal(meetingFromRow(null), null);
    assert.deepEqual(
      meetingFromRow({
        meeting_provider: "google_meet",
        meeting_url: "https://meet.google.com/abc-defg-hij",
        meeting_external_id: "evt",
        meeting_source: "api",
      }),
      {
        provider: "google_meet",
        joinUrl: "https://meet.google.com/abc-defg-hij",
        externalId: "evt",
        source: "api",
      },
    );
  });
});
