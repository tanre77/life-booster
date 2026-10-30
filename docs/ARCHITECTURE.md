# Architecture

**English** · [Español](es/ARCHITECTURE.md) · [Français](fr/ARCHITECTURE.md) · [Deutsch](de/ARCHITECTURE.md) · [Português (Brasil)](pt-BR/ARCHITECTURE.md) · [Italiano](it/ARCHITECTURE.md) · [简体中文](zh-CN/ARCHITECTURE.md) · [繁體中文](zh-TW/ARCHITECTURE.md) · [日本語](ja/ARCHITECTURE.md) · [한국어](ko/ARCHITECTURE.md) · [العربية](ar/ARCHITECTURE.md) · [हिन्दी](hi/ARCHITECTURE.md) · [Русский](ru/ARCHITECTURE.md) · [Tiếng Việt](vi/ARCHITECTURE.md) · [Türkçe](tr/ARCHITECTURE.md) · [Bahasa Indonesia](id/ARCHITECTURE.md) · [Polski](pl/ARCHITECTURE.md) · [Nederlands](nl/ARCHITECTURE.md) · [Українська](uk/ARCHITECTURE.md) · [Filipino](fil/ARCHITECTURE.md) · [Kiswahili](sw/ARCHITECTURE.md)

[How translations are updated](TRANSLATIONS.md).

Life Booster is a TanStack Start app. Pages live in `src/routes/`. Data changes go through server functions in [src/lib/life/api.ts](../src/lib/life/api.ts). Every function that reads or writes a person's rows uses `authMiddleware` and scopes SQL with `context.userId`. The client never sends a user id.

## Request path

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` applies pending files from `migrations/` once per process. Files are ordered by name. `migrations/auth/` is not in that glob. The auth schema is separate.

## Pages

| Route | File | Server functions |
|---|---|---|
| `/` | [src/routes/index.tsx](../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../src/routes/login.tsx) | Better Auth email and Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, messages |
| `/studio` | [src/routes/studio.tsx](../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../src/routes/you.tsx) | `saveDisplayName`, theme in the browser |
| `/desk` | [src/routes/desk.tsx](../src/routes/desk.tsx) | operator list, first signed-in user can claim the desk |

The shell in [src/components/shell.tsx](../src/components/shell.tsx) is the five tabs. Video is a full-screen stage and is not inside the tab padding.

## Data

```text
profiles              display name, operator flag
mood_entries          one row per user per date, mood 1–5, note, share flag
medications           name, dose, when taken, share flag
counselor_profiles    bio, tags as JSON text, rate, timezone, venmo, standing
availability_blocks   weekday + start_min + end_min, cascade on counselor delete
appointments          member, counselor, start, duration, price, pay, share_mood
reviews               one per appointment
session_messages      chat on an appointment
call_signals          WebRTC offer, answer, ice
call_presence         who has the room open
```

Migrations:

| File | What it adds |
|---|---|
| `0001_auth.sql` | auth tables |
| `0002_life_booster.sql` | the tables above, except Venmo and medications |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | deletes `sample-%` rows |
| `0005_medications.sql` | `medications` |

`0002` used to insert four sample counselors. That insert is gone. Do not put it back. `0004` deletes them on databases that already applied the old `0002`.

Tags (religions, philosophies, specialties) are JSON strings in text columns, not join tables. The allowed specialty labels are `SPECIALTIES` in [src/lib/life/catalog.ts](../src/lib/life/catalog.ts). Adding a specialty is a catalog change, not a migration.

## Who shows up in People

`loadDirectory` drops any `user_id` that starts with `sample-`. The public list then keeps a counselor only when `standing = 'active'` and they have at least one availability block. Saving a bio without hours does not list them. After `saveAvailability`, the studio invalidates the `["counselors"]` query.

Hours are stored as minutes from midnight. The form snaps to 30 minutes before zod checks `0…1440`. An empty window or an end that is not after the start is dropped. Saving with nothing left throws "Add an hour window for at least one day."

## Booking and money

`sessionPriceCents` is hourly rate times duration, over 60. With the sponsor box checked, that price is multiplied by `0.98`.

`bookAppointment` accepts `payMethod` of `google_pay` or `venmo`. Venmo is a deep link built in the booking card:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

The username is stored without `@` and stripped to letters, numbers, `_`, and `-`. There is no Venmo OAuth and no payment webhook. `pay_status` of `demo_authorized` means the link was opened, not that Venmo confirmed the money.

Slots come from the counselor's blocks in their timezone, minus already booked appointments. Durations are only 30, 60, 90, and 120.

## Mood, notes, medications

A member can write any of the last seven days, not only today. The chart and the week list both select the day that `saveMood` writes.

A counselor sees a note only when all of these are true:

1. The note is non-empty.
2. `mood_entries.share_with_counselors` is true.
3. The appointment's `share_mood` is true.
4. The note's date is in the 14 days ending on the visit date.

Medications use the same visit switch plus their own share flag. They are not limited to that date window. The member wrote the list. It is not a prescription record.

`getDashboard` must keep returning moods if you add a column. A thrown query here makes Today look like the save failed. The Today page also writes the saved mood into the React Query cache before it refetches, so a slow refresh does not clear the chart.

## Video

[src/components/video-room.tsx](../src/components/video-room.tsx) opens the camera, then polls `call_presence` and `call_signals`. The member and the counselor both create offers. If both have a local offer, the member keeps theirs and the counselor rolls back and answers.

The timer starts when `remoteLive` becomes true, then counts down `durationMin`. Recording is optional, local, and uses `MediaRecorder` on a mixed stream. It is not uploaded.

iPhone will not play remote audio from a hidden or muted video element, and a later `play()` is outside the tap. The remote `<video>` is muted. A separate `<audio>` element plays the voice. If `play()` is rejected, the room shows **Tap to hear**. The local preview video stays muted so the room does not echo.

## Appearance

Light is the default. Dark sets `html.dark` and swaps the tokens in [src/styles.css](../src/styles.css). The choice is stored in the browser from the You tab ([src/lib/theme.ts](../src/lib/theme.ts)). It is not a database column.

## Auth

Email and password, plus Apple, through Better Auth. Social buttons that the preview host does not support should fail with a visible message, not a blank screen. Server functions that need a person use `authMiddleware`. Do not trust an id from the request body.
