# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · **Kiswahili**

> **Kumbuka:** Tafsiri hii imesaidiwa na mashine. Kiingereza ndicho chanzo rasmi: [README.md](README.md).

[Jinsi tafsiri husasishwa](docs/TRANSLATIONS.md).

Wiki ya jinsi unavyojisikia, na mtu wa kuzungumza naye. Wanachama hurekodi hisia, huhifadhi maelezo, huorodhesha dawa, na huhifadhi ziara ya video ya dakika 30, 60, 90, au 120. Wasaidizi rika (katika programu: counselors) huchapisha wasifu, saa, na jina la mtumiaji la Venmo.

Huu ni msaada wa rika. Wasaidizi rika si wataalamu wa tiba walio na leseni, si wanasaikolojia, si madaktari wa akili, wala si watoa huduma za matibabu. Ziara si tiba, si utambuzi, wala si matibabu. Life Booster hahusiki na ushauri na anaweza kumwondoa msaidizi rika bila taarifa. Wakati wa dharura, piga simu au tuma ujumbe kwa 988.

## Unachoweza kufanya

| Kichupo | Nani | Nini |
|---|---|---|
| Today | Mwanachama | Rekodi siku yoyote ya wiki hii, ona wastani, ongeza dawa |
| Library | Yeyote aliyeingia | Mazoezi kwa mada, wasaidizi rika wa kufuata, hifadhi ziara |
| Visits | Wote wawili | Miadi ijayo na iliyopita, kisha chumba cha video |
| Studio | Msaidizi rika | Wasifu, utaalamu, kiwango cha saa, saa, jina la mtumiaji la Venmo |
| You | Aliyeingia | Jina linaloonekana, mwonekano mwanga au mweusi |

Kuingia ni barua pepe na nenosiri, au Apple. Maelezo na dawa hubaki binafsi hadi mwanachama avitie alama kuwa vinaweza kushirikiwa na awashe kushiriki kwa ziara hiyo.

## Malipo

Uhifadhi hufungua kiungo cha malipo cha Venmo kwa jina la mtumiaji la msaidizi rika (`venmo.com`, `txn=pay`). Huo si muunganisho wa mfanyabiashara wala hauthibitishi malipo. Google Pay ni chaguo la pili kupitia Payment Request API ya kivinjari. Apple Pay haitolewi kwenye skrini ya uhifadhi.

Punguzo la hiari la mdhamini ni 2% (`AD_DISCOUNT` katika [src/lib/life/money.ts](src/lib/life/money.ts)). Viwango ni $15 hadi $400 kwa saa.

## Kuendesha

```bash
npm run dev
```

Programu inasikiliza kwenye mlango 8080. `npm run typecheck` na `npm run build` vyote vipite. Mabadiliko ya schema yaende kwenye faili mpya chini ya [migrations/](migrations/). Usibadilishe uhamishaji uliotolewa tayari, isipokuwa kuuzuia usipande data tena.

Bila `DATABASE_URL`, seva hutumia Postgres iliyopachikwa (PGLite) na kutumia [migrations/](migrations/) inapoanza. Ukiwa na `DATABASE_URL`, `npm run db:migrate` hutumia faili zilezile kwa Neon.

## Mpangilio

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

Mwongozo huohuo, kwa Kiswahili: [muundo](docs/sw/ARCHITECTURE.md) na [prompti](docs/sw/PROMPTS.md).

Matawi `main`, `web`, `ios`, na `android` yanabaki kwenye commit ileile. Sukuma yote manne pamoja.

## Kanuni za bidhaa zinazovunjika kwa urahisi

- Msaidizi rika anaonekana katika People tu wakati `standing` ni `active` na ana angalau saa moja iliyohifadhiwa.
- Saa ni siku ya wiki `0` (Jumapili) hadi `6`, zimepangwa kwa dakika 30, na mwisho lazima uwe baada ya mwanzo.
- Usipande wasaidizi rika wa mfano (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Kushiriki ni swichi mbili: maelezo au dawa vimewekwa alama kuwa vinaweza kushirikiwa, na ziara ina `share_mood`. Ikiwa moja imezimwa, msaidizi rika haioni.
- Kipima muda cha ziara huanza mtu mwingine anapojiunga, na huhesabu kurudi muda uliohifadhiwa.
- iPhone hucheza sauti ya mtu mwingine kwenye kipengele chake cha audio. Video ya mbali hubaki kimya ili sauti isikwame kwenye picha iliyofichwa.
