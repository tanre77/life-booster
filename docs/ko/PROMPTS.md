# 프롬프트

[English](../PROMPTS.md) · [Español](../es/PROMPTS.md) · [Français](../fr/PROMPTS.md) · [Deutsch](../de/PROMPTS.md) · [Português (Brasil)](../pt-BR/PROMPTS.md) · [Italiano](../it/PROMPTS.md) · [简体中文](../zh-CN/PROMPTS.md) · [繁體中文](../zh-TW/PROMPTS.md) · [日本語](../ja/PROMPTS.md) · **한국어** · [العربية](../ar/PROMPTS.md) · [हिन्दी](../hi/PROMPTS.md) · [Русский](../ru/PROMPTS.md) · [Tiếng Việt](../vi/PROMPTS.md) · [Türkçe](../tr/PROMPTS.md) · [Bahasa Indonesia](../id/PROMPTS.md) · [Polski](../pl/PROMPTS.md) · [Nederlands](../nl/PROMPTS.md) · [Українська](../uk/PROMPTS.md) · [Filipino](../fil/PROMPTS.md) · [Kiswahili](../sw/PROMPTS.md)

> **참고:** 이 번역은 기계 보조로 작성되었습니다. 영어본이 기준입니다: [PROMPTS.md](../PROMPTS.md).

[번역을 업데이트하는 방법](../TRANSLATIONS.md).

한 번 잘못되었던 변경을 원할 때 이 중 하나를 붙여 넣으세요. 각 프롬프트는 파일과, 그대로 두어야 하는 규칙을 적습니다.

각 코드 블록 안의 글은 영어로 둡니다. 바꾸지 말고 붙여 넣으세요.

## 시간을 저장하면 카운셀러가 나타난다

```text
Saving hours in Studio must put that counselor on People.

Use saveAvailability in src/lib/life/api.ts and the hours form in src/routes/studio.tsx.
Snap each window to 30 minutes before validation. Drop windows whose end is not after the start.
If nothing remains, show "Add an hour window for at least one day."
loadDirectory lists a counselor only when standing is active and they have at least one block.
After a successful save, invalidate the ["counselors"] query.
Do not re-seed sample counselors.
```

## 예약의 Venmo

```text
Booking pays the counselor by opening Venmo. Do not add Venmo OAuth or a merchant webhook.

The username is counselor_profiles.venmo_handle, edited in Studio, stored without @.
The booking card in src/routes/counselors/$counselorId.tsx builds
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
and then calls bookAppointment with payMethod "venmo".
If the username is empty, the Venmo button stays disabled and says "Venmo not connected".
Leave Google Pay as the other method. Do not put Apple Pay back on the booking screen.
```

## 저장한 기분이 주간 차트에 남는다

```text
Saving today's mood must stay on the seven-day chart.

saveMood in src/lib/life/api.ts writes mood_entries for the selected loggedOn, limited to this week.
src/routes/index.tsx lets the member pick any of the last seven days from the chart or the week list.
After saveMood succeeds, update the ["dashboard", today] cache with that day before refetching.
Do not reset the note and mood from the server while the member is still editing that same day.
Normalize logged_on to YYYY-MM-DD. A Date string that does not match the selected day looks like a failed save.
```

## 카운셀러가 볼 수 있는 약

```text
Members keep a medication list on Today and can mark each one shareable.

Table medications (migrations/0005_medications.sql): name, dose, taken, share_with_counselors, owned by user_id.
saveMedication and deleteMedication only touch the signed-in user's rows. Cap the list at 40.
getSessionRoom returns medications only when the visit's share_mood is true and the row's share flag is true.
Show them in the Shared notes section of src/routes/session/$appointmentId.tsx.
This list is what the member typed. Do not call it a prescription.
```

## iPhone이 상대의 소리를 들을 수 있다

```text
The other person's voice has to play on an iPhone.

In src/components/video-room.tsx, keep the remote video muted and play the remote MediaStream on a separate audio element.
Call play() from the Start video / Join video tap, and if it is rejected show a "Tap to hear" button.
Do not put the remote video in display:none before it has a stream. Hidden video is silent on iOS.
Leave the local preview muted. The timer still starts only when the remote stream arrives.
```

## 전문 분야 추가

```text
Add the specialty to SPECIALTIES in src/lib/life/catalog.ts only.
Studio and the People filter both read that array. Do not add a migration or a second list.
Keep the label short, like the ones already there.
```

## Push

```text
Commit the Life Booster changes and push the same commit to main, web, ios, and android on tanre77/life-booster.
Do not commit .project_id.
```
