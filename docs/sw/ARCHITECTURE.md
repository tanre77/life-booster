# Muundo

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · **Kiswahili**

> **Kumbuka:** Tafsiri hii imesaidiwa na mashine. Kiingereza ndicho chanzo rasmi: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Jinsi tafsiri husasishwa](../TRANSLATIONS.md).

Life Booster ni programu ya TanStack Start. Kurasa ziko katika `src/routes/`. Mabadiliko ya data hupitia kazi za seva katika [src/lib/life/api.ts](../../src/lib/life/api.ts). Kila kazi inayosoma au kuandika safu za mtu hutumia `authMiddleware` na kuweka mipaka ya SQL kwa `context.userId`. Mteja hautumi kamwe kitambulisho cha mtumiaji.

## Njia ya ombi

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` hutumia faili zinazosubiri kutoka `migrations/` mara moja kwa kila mchakato. Faili zimepangwa kwa jina. `migrations/auth/` haiko katika glob hiyo. Muundo wa auth uko tofauti.

## Kurasa

| Njia | Faili | Kazi za seva |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, barua pepe, na Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, ujumbe |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, mandhari katika kivinjari |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | orodha ya waendeshaji; mtu wa kwanza aliyeingia anaweza kuchukua desk |

Ganda katika [src/components/shell.tsx](../../src/components/shell.tsx) ni vichupo vitano. Video ni jukwaa la skrini nzima na haiko ndani ya nafasi ya vichupo.

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

Uhamishaji:

| Faili | Kinachoongezwa |
|---|---|
| `0001_auth.sql` | majedwali ya auth |
| `0002_life_booster.sql` | majedwali ya juu, isipokuwa Venmo na dawa |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | hufuta safu za `sample-%` |
| `0005_medications.sql` | `medications` |

`0002` ilikuwa inaingiza wasaidizi rika wanne wa mfano. Uingizaji huo umeondoka. Usirudishe. `0004` huwafuta kwenye hifadhidata zilizotumia `0002` ya zamani.

Lebo (dini, falsafa, utaalamu) ni maandishi ya JSON katika safu wima za maandishi, si majedwali ya kuunganisha. Lebo za utaalamu zinazoruhusiwa ni `SPECIALTIES` katika [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Kuongeza utaalamu ni mabadiliko ya katalogi, si uhamishaji.

## Nani anaonekana katika People

`loadDirectory` huacha kila `user_id` inayoanza na `sample-`. Orodha ya umma humuweka msaidizi rika tu wakati `standing = 'active'` na kuna angalau kipande kimoja cha upatikanaji. Kuhifadhi wasifu bila saa hakuwaweki kwenye orodha. Baada ya `saveAvailability`, Studio hubatilisha swala la `["counselors"]`.

Saa huhifadhiwa kama dakika tangu usiku wa manane. Fomu hupanga kwa dakika 30 kabla zod haijakagua `0…1440`. Dirisha tupu, au mwisho usio baada ya mwanzo, huachwa. Kuhifadhi bila kilichobaki hutupa "Add an hour window for at least one day."

## Uhifadhi na pesa

`sessionPriceCents` ni kiwango cha saa kuzidisha muda, kugawanywa kwa 60. Kisanduku cha mdhamini kikiwa kimetiwa tiki, bei hiyo huzidishwa kwa `0.98`.

`bookAppointment` hukubali `payMethod` ya `google_pay` au `venmo`. Venmo ni kiungo kirefu kinachojengwa kwenye kadi ya uhifadhi:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

Jina la mtumiaji huhifadhiwa bila `@` na hupunguzwa kuwa herufi, nambari, `_`, na `-`. Hakuna OAuth ya Venmo wala webhook ya malipo. `pay_status` ya `demo_authorized` inamaanisha kiungo kilifunguliwa, si kwamba Venmo imethibitisha pesa.

Nafasi hutoka kwenye vipande vya msaidizi rika katika saa zake za eneo, ukiondoa miadi iliyohifadhiwa tayari. Muda ni 30, 60, 90, na 120 tu.

## Hisia, maelezo, dawa

Mwanachama anaweza kuandika siku yoyote kati ya saba zilizopita, si leo tu. Chati na orodha ya wiki zote mbili huchagua siku ambayo `saveMood` huandika.

Msaidizi rika huona maelezo tu wakati yote haya ni kweli:

1. Maelezo hayana utupu.
2. `mood_entries.share_with_counselors` ni kweli.
3. `share_mood` ya miadi ni kweli.
4. Tarehe ya maelezo iko ndani ya siku 14 zinazoishia tarehe ya ziara.

Dawa hutumia swichi ileile ya ziara pamoja na bendera yao ya kushiriki. Hazina kikomo cha dirisha hilo la tarehe. Mwanachama aliandika orodha. Si rekodi ya dawa iliyoagizwa.

`getDashboard` lazima iendelee kurudisha hisia ukiongeza safu wima. Swala linalotupa hapa hufanya Today ionekane kama uhifadhi umeshindwa. Ukurasa wa Today pia huandika hisia iliyohifadhiwa kwenye akiba ya React Query kabla ya kuchukua tena, ili uonyeshaji upya wa polepole usifute chati.

## Video

[src/components/video-room.tsx](../../src/components/video-room.tsx) hufungua kamera, kisha huuliza `call_presence` na `call_signals`. Mwanachama na msaidizi rika wote huunda matoleo. Ikiwa wote wana toleo la karibu, mwanachama hubaki na lake na msaidizi rika hurudi nyuma kisha hujibu.

Kipima muda huanza `remoteLive` inapokuwa kweli, kisha huhesabu kurudi `durationMin`. Kurekodi ni hiari, ni karibu, na hutumia `MediaRecorder` kwenye mtiririko uliochanganywa. Haipakiwi.

iPhone haitacheza sauti ya mbali kutoka kipengele cha video kilichofichwa au kimya, na `play()` ya baadaye iko nje ya mguso. `<video>` ya mbali iko kimya. Kipengele tofauti cha `<audio>` hucheza sauti. Ikiwa `play()` imekataliwa, chumba kinaonyesha **Tap to hear**. Hakikisho la karibu hubaki kimya ili chumba kisitoe mwangwi.

## Mwonekano

Mwanga ndio chaguo-msingi. Giza huweka `html.dark` na kubadilisha tokeni katika [src/styles.css](../../src/styles.css). Chaguo huhifadhiwa katika kivinjari kutoka kichupo cha You ([src/lib/theme.ts](../../src/lib/theme.ts)). Si safu wima ya hifadhidata.

## Uthibitishaji

Barua pepe na nenosiri, pamoja na Apple, kupitia Better Auth. Vitufe vya kijamii ambavyo mwenyeji wa onyesho la awali havitumii vinapaswa kushindwa kwa ujumbe unaoonekana, si skrini tupu. Kazi za seva zinazohitaji mtu hutumia `authMiddleware`. Usiamini kitambulisho kutoka mwili wa ombi.
