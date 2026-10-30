# 提示

[English](../PROMPTS.md) · [Español](../es/PROMPTS.md) · [Français](../fr/PROMPTS.md) · [Deutsch](../de/PROMPTS.md) · [Português (Brasil)](../pt-BR/PROMPTS.md) · [Italiano](../it/PROMPTS.md) · **简体中文** · [繁體中文](../zh-TW/PROMPTS.md) · [日本語](../ja/PROMPTS.md) · [한국어](../ko/PROMPTS.md) · [العربية](../ar/PROMPTS.md) · [हिन्दी](../hi/PROMPTS.md) · [Русский](../ru/PROMPTS.md) · [Tiếng Việt](../vi/PROMPTS.md) · [Türkçe](../tr/PROMPTS.md) · [Bahasa Indonesia](../id/PROMPTS.md) · [Polski](../pl/PROMPTS.md) · [Nederlands](../nl/PROMPTS.md) · [Українська](../uk/PROMPTS.md) · [Filipino](../fil/PROMPTS.md) · [Kiswahili](../sw/PROMPTS.md)

> **说明：** 本译文由机器辅助完成。英文版为权威版本：[PROMPTS.md](../PROMPTS.md)。

[如何更新译文](../TRANSLATIONS.md).

当你想做一项曾经出错过的改动时，贴上其中一条。每条提示写出文件，以及必须保持不动的规则。

每个代码块里的文字保持英文。原样粘贴。

## 保存小时后陪伴者出现

```text
Saving hours in Studio must put that counselor on People.

Use saveAvailability in src/lib/life/api.ts and the hours form in src/routes/studio.tsx.
Snap each window to 30 minutes before validation. Drop windows whose end is not after the start.
If nothing remains, show "Add an hour window for at least one day."
loadDirectory lists a counselor only when standing is active and they have at least one block.
After a successful save, invalidate the ["counselors"] query.
Do not re-seed sample counselors.
```

## 预约上的 Venmo

```text
Booking pays the counselor by opening Venmo. Do not add Venmo OAuth or a merchant webhook.

The username is counselor_profiles.venmo_handle, edited in Studio, stored without @.
The booking card in src/routes/counselors/$counselorId.tsx builds
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
and then calls bookAppointment with payMethod "venmo".
If the username is empty, the Venmo button stays disabled and says "Venmo not connected".
Leave Google Pay as the other method. Do not put Apple Pay back on the booking screen.
```

## 保存的心情留在一周图表上

```text
Saving today's mood must stay on the seven-day chart.

saveMood in src/lib/life/api.ts writes mood_entries for the selected loggedOn, limited to this week.
src/routes/index.tsx lets the member pick any of the last seven days from the chart or the week list.
After saveMood succeeds, update the ["dashboard", today] cache with that day before refetching.
Do not reset the note and mood from the server while the member is still editing that same day.
Normalize logged_on to YYYY-MM-DD. A Date string that does not match the selected day looks like a failed save.
```

## 陪伴者能看到的药物

```text
Members keep a medication list on Today and can mark each one shareable.

Table medications (migrations/0005_medications.sql): name, dose, taken, share_with_counselors, owned by user_id.
saveMedication and deleteMedication only touch the signed-in user's rows. Cap the list at 40.
getSessionRoom returns medications only when the visit's share_mood is true and the row's share flag is true.
Show them in the Shared notes section of src/routes/session/$appointmentId.tsx.
This list is what the member typed. Do not call it a prescription.
```

## iPhone 能听到对方

```text
The other person's voice has to play on an iPhone.

In src/components/video-room.tsx, keep the remote video muted and play the remote MediaStream on a separate audio element.
Call play() from the Start video / Join video tap, and if it is rejected show a "Tap to hear" button.
Do not put the remote video in display:none before it has a stream. Hidden video is silent on iOS.
Leave the local preview muted. The timer still starts only when the remote stream arrives.
```

## 添加一项专长

```text
Add the specialty to SPECIALTIES in src/lib/life/catalog.ts only.
Studio and the People filter both read that array. Do not add a migration or a second list.
Keep the label short, like the ones already there.
```

## 推送

```text
Commit the Life Booster changes and push the same commit to main, web, ios, and android on tanre77/life-booster.
Do not commit .project_id.
```
