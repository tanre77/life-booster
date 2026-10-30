# Architectuur

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · **Nederlands** · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **Let op:** Deze vertaling is machine-ondersteund. Engels is de gezaghebbende versie: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Hoe vertalingen worden bijgewerkt](../TRANSLATIONS.md).

Life Booster is een TanStack Start-app. Pagina's staan in `src/routes/`. Gegevenswijzigingen gaan door serverfuncties in [src/lib/life/api.ts](../../src/lib/life/api.ts). Elke functie die rijen van een persoon leest of schrijft, gebruikt `authMiddleware` en begrenst SQL met `context.userId`. De client stuurt nooit een gebruikers-id.

## Pad van het verzoek

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` past openstaande bestanden uit `migrations/` één keer per proces toe. Bestanden staan op naam gesorteerd. `migrations/auth/` zit niet in die glob. Het auth-schema staat apart.

## Pagina's

| Route | Bestand | Serverfuncties |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, e-mail en Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, berichten |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, thema in de browser |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | operatorlijst; de eerste aangemelde persoon kan de desk claimen |

De schil in [src/components/shell.tsx](../../src/components/shell.tsx) is de vijf tabs. Video is een volledig scherm en zit niet in de opvulling van de tabs.

## Gegevens

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

Migraties:

| Bestand | Wat het toevoegt |
|---|---|
| `0001_auth.sql` | auth-tabellen |
| `0002_life_booster.sql` | de tabellen hierboven, behalve Venmo en medicijnen |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | verwijdert rijen `sample-%` |
| `0005_medications.sql` | `medications` |

`0002` voegde vroeger vier voorbeeldbegeleiders in. Die insert is weg. Zet hem niet terug. `0004` verwijdert hen op databases die de oude `0002` al hebben toegepast.

Tags (religies, filosofieën, specialismen) zijn JSON-tekenreeksen in tekstkolommen, geen koppeltabellen. De toegestane specialismelabels zijn `SPECIALTIES` in [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Een specialisme toevoegen is een cataloguswijziging, geen migratie.

## Wie in People verschijnt

`loadDirectory` laat elke `user_id` vallen die met `sample-` begint. De openbare lijst houdt een begeleider alleen als `standing = 'active'` en er minstens één beschikbaarheidsblok is. Een bio opslaan zonder uren zet hen niet op de lijst. Na `saveAvailability` maakt Studio de query `["counselors"]` ongeldig.

Uren worden opgeslagen als minuten sinds middernacht. Het formulier zet vast op 30 minuten voordat zod `0…1440` controleert. Een leeg venster, of een einde dat niet na het begin ligt, valt weg. Opslaan als er niets over is, gooit "Add an hour window for at least one day."

## Boeken en geld

`sessionPriceCents` is uurtarief maal duur, gedeeld door 60. Met het sponsorvakje aan wordt die prijs vermenigvuldigd met `0.98`.

`bookAppointment` accepteert `payMethod` van `google_pay` of `venmo`. Venmo is een deeplink die de boekingskaart bouwt:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

De gebruikersnaam wordt zonder `@` opgeslagen en teruggebracht tot letters, cijfers, `_` en `-`. Er is geen Venmo-OAuth en geen betalingswebhook. Een `pay_status` van `demo_authorized` betekent dat de link is geopend, niet dat Venmo het geld heeft bevestigd.

Plekken komen uit de blokken van de begeleider in diens tijdzone, min al geboekte afspraken. Duur is alleen 30, 60, 90 en 120.

## Stemming, notities, medicijnen

Een lid kan elk van de laatste zeven dagen schrijven, niet alleen vandaag. De grafiek en de weeklijst kiezen allebei de dag die `saveMood` schrijft.

Een begeleider ziet een notitie alleen als dit allemaal waar is:

1. De notitie is niet leeg.
2. `mood_entries.share_with_counselors` is waar.
3. De `share_mood` van de afspraak is waar.
4. De datum van de notitie valt in de 14 dagen die eindigen op de bezoekdatum.

Medicijnen gebruiken dezelfde bezoekschakelaar plus hun eigen deelvlag. Ze zijn niet beperkt tot dat datumvenster. Het lid schreef de lijst. Het is geen receptrecord.

`getDashboard` moet stemmingen blijven teruggeven als je een kolom toevoegt. Een query die hier gooit, laat Today lijken op een mislukte opslag. De pagina Today schrijft de opgeslagen stemming ook in de React Query-cache voordat hij opnieuw ophaalt, zodat een trage verversing de grafiek niet leegmaakt.

## Video

[src/components/video-room.tsx](../../src/components/video-room.tsx) opent de camera en polt daarna `call_presence` en `call_signals`. Het lid en de begeleider maken allebei offers. Als beiden een lokaal offer hebben, houdt het lid het zijne en rolt de begeleider terug en antwoordt.

De timer start als `remoteLive` waar wordt, en telt dan `durationMin` af. Opname is optioneel, lokaal, en gebruikt `MediaRecorder` op een gemengde stroom. Die wordt niet geüpload.

De iPhone speelt geen audio op afstand af vanuit een verborgen of gedempt video-element, en een latere `play()` valt buiten de tik. De `<video>` op afstand is gedempt. Een apart `<audio>`-element speelt de stem. Als `play()` wordt geweigerd, toont de ruimte **Tap to hear**. De lokale voorvertoning blijft gedempt zodat de ruimte niet echoot.

## Weergave

Licht is de standaard. Donker zet `html.dark` en wisselt de tokens in [src/styles.css](../../src/styles.css). De keuze staat in de browser vanaf het tabblad You ([src/lib/theme.ts](../../src/lib/theme.ts)). Het is geen databasekolom.

## Auth

E-mail en wachtwoord, plus Apple, via Better Auth. Sociale knoppen die de previewhost niet ondersteunt, moeten falen met een zichtbaar bericht, niet met een leeg scherm. Serverfuncties die een persoon nodig hebben, gebruiken `authMiddleware`. Vertrouw geen id uit de verzoekbody.
