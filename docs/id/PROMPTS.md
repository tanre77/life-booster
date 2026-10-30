# Prompt

[English](../PROMPTS.md) · [Español](../es/PROMPTS.md) · [Français](../fr/PROMPTS.md) · [Deutsch](../de/PROMPTS.md) · [Português (Brasil)](../pt-BR/PROMPTS.md) · [Italiano](../it/PROMPTS.md) · [简体中文](../zh-CN/PROMPTS.md) · [繁體中文](../zh-TW/PROMPTS.md) · [日本語](../ja/PROMPTS.md) · [한국어](../ko/PROMPTS.md) · [العربية](../ar/PROMPTS.md) · [हिन्दी](../hi/PROMPTS.md) · [Русский](../ru/PROMPTS.md) · [Tiếng Việt](../vi/PROMPTS.md) · [Türkçe](../tr/PROMPTS.md) · **Bahasa Indonesia** · [Polski](../pl/PROMPTS.md) · [Nederlands](../nl/PROMPTS.md) · [Українська](../uk/PROMPTS.md) · [Filipino](../fil/PROMPTS.md) · [Kiswahili](../sw/PROMPTS.md)

> **Catatan:** Terjemahan ini dibantu mesin. Bahasa Inggris adalah versi yang berlaku: [PROMPTS.md](../PROMPTS.md).

[Cara memperbarui terjemahan](../TRANSLATIONS.md).

Tempel salah satu dari ini saat kamu menginginkan perubahan yang sudah pernah salah sekali. Setiap prompt menyebut berkas dan aturan yang harus dibiarkan.

Teks di dalam setiap blok kode tetap bahasa Inggris. Tempel tanpa mengubahnya.

## Pendamping muncul setelah menyimpan jam

```text
Saving hours in Studio must put that counselor on People.

Use saveAvailability in src/lib/life/api.ts and the hours form in src/routes/studio.tsx.
Snap each window to 30 minutes before validation. Drop windows whose end is not after the start.
If nothing remains, show "Add an hour window for at least one day."
loadDirectory lists a counselor only when standing is active and they have at least one block.
After a successful save, invalidate the ["counselors"] query.
Do not re-seed sample counselors.
```

## Venmo pada pemesanan

```text
Booking pays the counselor by opening Venmo. Do not add Venmo OAuth or a merchant webhook.

The username is counselor_profiles.venmo_handle, edited in Studio, stored without @.
The booking card in src/routes/counselors/$counselorId.tsx builds
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
and then calls bookAppointment with payMethod "venmo".
If the username is empty, the Venmo button stays disabled and says "Venmo not connected".
Leave Google Pay as the other method. Do not put Apple Pay back on the booking screen.
```

## Suasana hati yang tersimpan tetap di bagan minggu

```text
Saving today's mood must stay on the seven-day chart.

saveMood in src/lib/life/api.ts writes mood_entries for the selected loggedOn, limited to this week.
src/routes/index.tsx lets the member pick any of the last seven days from the chart or the week list.
After saveMood succeeds, update the ["dashboard", today] cache with that day before refetching.
Do not reset the note and mood from the server while the member is still editing that same day.
Normalize logged_on to YYYY-MM-DD. A Date string that does not match the selected day looks like a failed save.
```

## Obat yang dapat dilihat pendamping

```text
Members keep a medication list on Today and can mark each one shareable.

Table medications (migrations/0005_medications.sql): name, dose, taken, share_with_counselors, owned by user_id.
saveMedication and deleteMedication only touch the signed-in user's rows. Cap the list at 40.
getSessionRoom returns medications only when the visit's share_mood is true and the row's share flag is true.
Show them in the Shared notes section of src/routes/session/$appointmentId.tsx.
This list is what the member typed. Do not call it a prescription.
```

## iPhone dapat mendengar orang lain

```text
The other person's voice has to play on an iPhone.

In src/components/video-room.tsx, keep the remote video muted and play the remote MediaStream on a separate audio element.
Call play() from the Start video / Join video tap, and if it is rejected show a "Tap to hear" button.
Do not put the remote video in display:none before it has a stream. Hidden video is silent on iOS.
Leave the local preview muted. The timer still starts only when the remote stream arrives.
```

## Tambah satu keahlian

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
