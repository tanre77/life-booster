# Arkitektura

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · **Filipino** · [Kiswahili](../sw/ARCHITECTURE.md)

> **Tala:** Ang salin na ito ay tinulungan ng makina. Ang Ingles ang opisyal na bersyon: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Paano ina-update ang mga salin](../TRANSLATIONS.md).

Ang Life Booster ay isang TanStack Start app. Nasa `src/routes/` ang mga pahina. Dumadaan ang pagbabago ng data sa mga server function sa [src/lib/life/api.ts](../../src/lib/life/api.ts). Ang bawat function na nagbabasa o nagsusulat ng mga row ng isang tao ay gumagamit ng `authMiddleware` at nililimitahan ang SQL gamit ang `context.userId`. Hindi kailanman nagpapadala ng user id ang client.

## Landas ng request

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

Inilalapat ng `getSql()` ang mga nakabinbing file mula sa `migrations/` nang isang beses bawat proseso. Nakaayos ang mga file ayon sa pangalan. Wala sa glob na iyon ang `migrations/auth/`. Hiwalay ang schema ng auth.

## Mga pahina

| Ruta | File | Mga server function |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, email, at Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, mga mensahe |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, tema sa browser |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | listahan ng operator; maaaring kunin ng unang naka-sign in ang desk |

Ang shell sa [src/components/shell.tsx](../../src/components/shell.tsx) ay ang limang tab. Ang video ay full-screen na entablado at wala sa padding ng mga tab.

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

Mga migration:

| File | Idinadagdag |
|---|---|
| `0001_auth.sql` | mga talahanayan ng auth |
| `0002_life_booster.sql` | ang mga talahanayan sa itaas, maliban sa Venmo at mga gamot |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | binubura ang mga row na `sample-%` |
| `0005_medications.sql` | `medications` |

Dati ay naglalagay ang `0002` ng apat na halimbawang kasama. Wala na ang insert na iyon. Huwag itong ibalik. Binubura sila ng `0004` sa mga database na nailapat na ang lumang `0002`.

Ang mga tag (relihiyon, pilosopiya, specialty) ay JSON string sa mga text column, hindi join table. Ang pinapayagang label ng specialty ay `SPECIALTIES` sa [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Ang pagdagdag ng specialty ay pagbabago sa catalog, hindi migration.

## Sino ang lumalabas sa People

Itinatapon ng `loadDirectory` ang anumang `user_id` na nagsisimula sa `sample-`. Pinapanatili ng pampublikong listahan ang isang kasama lamang kapag `standing = 'active'` at may kahit isang bloke ng availability. Hindi sila naililista ng pag-save ng bio na walang oras. Pagkatapos ng `saveAvailability`, pinawawalang-bisa ng Studio ang query na `["counselors"]`.

Naka-imbak ang mga oras bilang minuto mula hatinggabi. Kumakapit ang form sa 30 minuto bago suriin ng zod ang `0…1440`. Ang walang lamang window, o ang dulo na hindi pagkatapos ng simula, ay ibinabagsak. Ang pag-save na walang natira ay nagtatapon ng "Add an hour window for at least one day."

## Pag-book at pera

Ang `sessionPriceCents` ay oras-oras na rate na pinarami sa tagal, hinati sa 60. Kapag naka-check ang kahon ng sponsor, pinaparami ang presyong iyon sa `0.98`.

Tumatanggap ang `bookAppointment` ng `payMethod` na `google_pay` o `venmo`. Ang Venmo ay deep link na binubuo sa booking card:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

Naka-imbak ang username nang walang `@` at pinuputol sa mga letra, numero, `_`, at `-`. Walang Venmo OAuth at walang payment webhook. Ang `pay_status` na `demo_authorized` ay nangangahulugang nabuksan ang link, hindi na kinumpirma ng Venmo ang pera.

Galing ang mga slot sa mga bloke ng kasama sa kanilang timezone, bawas ang mga appointment na naka-book na. Ang mga tagal ay 30, 60, 90, at 120 lamang.

## Mood, tala, gamot

Maaaring isulat ng miyembro ang alinman sa huling pitong araw, hindi ngayon lamang. Parehong pinipili ng chart at ng listahan ng linggo ang araw na sinusulat ng `saveMood`.

Nakikita ng kasama ang tala lamang kapag totoo ang lahat ng ito:

1. Hindi walang laman ang tala.
2. Totoo ang `mood_entries.share_with_counselors`.
3. Totoo ang `share_mood` ng appointment.
4. Ang petsa ng tala ay nasa 14 na araw na nagtatapos sa petsa ng pagbisita.

Ginagamit ng mga gamot ang parehong switch ng pagbisita kasama ang sarili nilang share flag. Hindi sila limitado sa window ng petsang iyon. Ang miyembro ang sumulat ng listahan. Hindi ito talaan ng reseta.

Dapat patuloy na magbalik ng mga mood ang `getDashboard` kung magdadagdag ka ng column. Ang query na magtapon dito ay nagpapamukhang nabigo ang pag-save sa Today. Isinusulat din ng pahina ng Today ang na-save na mood sa cache ng React Query bago muling kumuha, kaya hindi nabubura ng mabagal na refresh ang chart.

## Video

Binubuksan ng [src/components/video-room.tsx](../../src/components/video-room.tsx) ang camera, tapos kinukuha ang `call_presence` at `call_signals`. Parehong gumagawa ng offer ang miyembro at ang kasama. Kung pareho silang may lokal na offer, pinapanatili ng miyembro ang kanya at umuurong at sumasagot ang kasama.

Nagsisimula ang timer kapag naging totoo ang `remoteLive`, tapos binibilang pababa ang `durationMin`. Opsyonal at lokal ang recording, at gumagamit ng `MediaRecorder` sa pinaghalong stream. Hindi ito ina-upload.

Hindi tutugtugin ng iPhone ang remote na audio mula sa nakatago o naka-mute na video element, at ang huling `play()` ay nasa labas ng tap. Naka-mute ang remote na `<video>`. Hiwalay na `<audio>` element ang tumutugtog ng boses. Kung tinanggihan ang `play()`, ipinapakita ng kuwarto ang **Tap to hear**. Nananatiling naka-mute ang lokal na preview para hindi umalingawngaw ang kuwarto.

## Anyo

Ang maliwanag ang default. Itinatakda ng madilim ang `html.dark` at pinapalitan ang mga token sa [src/styles.css](../../src/styles.css). Naka-imbak ang pinili sa browser mula sa tab na You ([src/lib/theme.ts](../../src/lib/theme.ts)). Hindi ito column ng database.

## Auth

Email at password, kasama ang Apple, sa pamamagitan ng Better Auth. Ang mga social button na hindi suportado ng preview host ay dapat mabigo nang may nakikitang mensahe, hindi blangkong screen. Ang mga server function na nangangailangan ng tao ay gumagamit ng `authMiddleware`. Huwag pagkatiwalaan ang id mula sa katawan ng request.
