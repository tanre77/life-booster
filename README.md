# Life Booster

A week of how you feel, and someone to talk with. Members log a mood, keep notes, list medications, and book a video visit of 30, 60, 90, or 120 minutes. Counselors publish a profile, hours, and a Venmo username.

This is peer support. Counselors are not licensed therapists, psychologists, psychiatrists, or medical providers. A visit is not therapy, diagnosis, or treatment. Life Booster is not liable for advice and may dismiss a counselor without notice. In a crisis, call or text 988.

## What you can do

| Tab | Who | What |
|---|---|---|
| Today | Member | Log any day this week, see the average, add medications |
| Library | Anyone signed in | Practices by topic, counselors to follow, book a visit |
| Visits | Both | Upcoming and past appointments, then the video room |
| Studio | Counselor | Bio, specialties, hourly rate, hours, Venmo username |
| You | Signed in | Display name, light or dark appearance, Zoom or Google Meet |

Sign-in is email and password, or Apple. Notes and medications stay private until the member marks them shareable and turns sharing on for that visit.

## Pay

Booking opens a Venmo pay link to the counselor's username (`venmo.com`, `txn=pay`). That is not a merchant connection and it does not confirm the payment. Google Pay is a second option through the browser Payment Request API. Apple Pay is not offered on the booking screen.

The optional sponsor discount is 2% (`AD_DISCOUNT` in [src/lib/life/money.ts](src/lib/life/money.ts)). Rates are $15 to $400 an hour.

## Run

```bash
npm run dev
```

The app listens on port 8080. `npm run typecheck` and `npm run build` should both pass. Schema changes go in a new file under [migrations/](migrations/). Do not edit a migration that has already shipped except to stop it from re-seeding data.

## Video meetings

On You, each person picks Zoom or Google Meet. That choice is saved on their profile and used when they create a link for a visit.

`createMeeting` in [src/lib/life/meetings.ts](src/lib/life/meetings.ts) is the shared entry. Google Meet creates a Calendar event with `conferenceData` (`conferenceDataVersion=1`, solution `hangoutsMeet`). Zoom calls the Create Meeting API (`POST /v2/users/me/meetings`) with a Server-to-Server OAuth token. Credentials come from the environment only:

| Variable | Provider |
|---|---|
| `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` | Zoom |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Google Meet |
| `GOOGLE_CALENDAR_ID` | Optional. Defaults to `primary` |
| `VITE_LIFE_BOOSTER_DEMO=1` or `?demo=1` | Practice links. Zoom and Google are not called |

If the chosen provider has no credentials, the visit offers an instant link (`https://zoom.us/start/videomeeting` or `https://meet.google.com/new`) or a link the person pastes in.

Meeting titles are the fixed phrase "Life Booster visit". The request does not include notes. The only journal in the repo is the fictional, anonymized Alex demo in [src/lib/life/demo-journal.ts](src/lib/life/demo-journal.ts).

Without `DATABASE_URL`, the server uses embedded Postgres (PGLite) and applies [migrations/](migrations/) on startup. With `DATABASE_URL`, `npm run db:migrate` applies the same files to Neon.

## Layout

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

Branches `main`, `web`, `ios`, and `android` are kept on the same commit. Push all four together.

## Product rules that are easy to break

- A counselor appears in People only when their standing is `active` and they have at least one saved hour.
- Hours are weekday `0` (Sunday) through `6`, snapped to 30 minutes, and the end must be after the start.
- Do not seed sample counselors (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Sharing is two switches: the note or medication is marked shareable, and the visit has `share_mood`. Either one off means the counselor does not see it.
- The visit timer starts when the other person joins, and it counts down the booked duration.
- iPhone plays the other person's voice on its own audio element. The remote video stays muted so the sound is not stuck on a hidden picture.
