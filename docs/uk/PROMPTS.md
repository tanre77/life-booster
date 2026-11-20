# Промпти

[English](../PROMPTS.md) · [Español](../es/PROMPTS.md) · [Français](../fr/PROMPTS.md) · [Deutsch](../de/PROMPTS.md) · [Português (Brasil)](../pt-BR/PROMPTS.md) · [Italiano](../it/PROMPTS.md) · [简体中文](../zh-CN/PROMPTS.md) · [繁體中文](../zh-TW/PROMPTS.md) · [日本語](../ja/PROMPTS.md) · [한국어](../ko/PROMPTS.md) · [العربية](../ar/PROMPTS.md) · [हिन्दी](../hi/PROMPTS.md) · [Русский](../ru/PROMPTS.md) · [Tiếng Việt](../vi/PROMPTS.md) · [Türkçe](../tr/PROMPTS.md) · [Bahasa Indonesia](../id/PROMPTS.md) · [Polski](../pl/PROMPTS.md) · [Nederlands](../nl/PROMPTS.md) · **Українська** · [Filipino](../fil/PROMPTS.md) · [Kiswahili](../sw/PROMPTS.md)

> **Примітка:** Цей переклад зроблено з допомогою машини. Англійська версія є авторитетною: [PROMPTS.md](../PROMPTS.md).

[Як оновлюються переклади](../TRANSLATIONS.md).

Вставте один із цих текстів, коли потрібна правка, яка вже один раз ламалася. Кожен промпт називає файли і правило, яке треба лишити.

Текст усередині кожного блока коду лишається англійською. Вставляйте його без змін.

## Супровідник з’являється після збереження годин

```text
Saving hours in Studio must put that counselor on People.

Use saveAvailability in src/lib/life/api.ts and the hours form in src/routes/studio.tsx.
Snap each window to 30 minutes before validation. Drop windows whose end is not after the start.
If nothing remains, show "Add an hour window for at least one day."
loadDirectory lists a counselor only when standing is active and they have at least one block.
After a successful save, invalidate the ["counselors"] query.
Do not re-seed sample counselors.
```

## Venmo під час бронювання

```text
Booking pays the counselor by opening Venmo. Do not add Venmo OAuth or a merchant webhook.

The username is counselor_profiles.venmo_handle, edited in Studio, stored without @.
The booking card in src/routes/counselors/$counselorId.tsx builds
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
and then calls bookAppointment with payMethod "venmo".
If the username is empty, the Venmo button stays disabled and says "Venmo not connected".
Leave Google Pay as the other method. Do not put Apple Pay back on the booking screen.
```

## Збережений настрій лишається на графіку тижня

```text
Saving today's mood must stay on the seven-day chart.

saveMood in src/lib/life/api.ts writes mood_entries for the selected loggedOn, limited to this week.
src/routes/index.tsx lets the member pick any of the last seven days from the chart or the week list.
After saveMood succeeds, update the ["dashboard", today] cache with that day before refetching.
Do not reset the note and mood from the server while the member is still editing that same day.
Normalize logged_on to YYYY-MM-DD. A Date string that does not match the selected day looks like a failed save.
```

## Ліки, які бачить супровідник

```text
Members keep a medication list on Today and can mark each one shareable.

Table medications (migrations/0005_medications.sql): name, dose, taken, share_with_counselors, owned by user_id.
saveMedication and deleteMedication only touch the signed-in user's rows. Cap the list at 40.
getSessionRoom returns medications only when the visit's share_mood is true and the row's share flag is true.
Show them in the Shared notes section of src/routes/session/$appointmentId.tsx.
This list is what the member typed. Do not call it a prescription.
```

## iPhone чує іншу людину

```text
The other person's voice has to play on an iPhone.

In src/components/video-room.tsx, keep the remote video muted and play the remote MediaStream on a separate audio element.
Call play() from the Start video / Join video tap, and if it is rejected show a "Tap to hear" button.
Do not put the remote video in display:none before it has a stream. Hidden video is silent on iOS.
Leave the local preview muted. The timer still starts only when the remote stream arrives.
```

## Додати спеціалізацію

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
