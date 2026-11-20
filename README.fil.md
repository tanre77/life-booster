# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · **Filipino** · [Kiswahili](README.sw.md)

> **Tala:** Ang salin na ito ay tinulungan ng makina. Ang Ingles ang opisyal na bersyon: [README.md](README.md).

[Paano ina-update ang mga salin](docs/TRANSLATIONS.md).

Isang linggo ng iyong pakiramdam, at may kausap. Nagla-log ang mga miyembro ng mood, nagtatago ng mga tala, naglilista ng mga gamot, at nagbu-book ng pagbisita sa video na 30, 60, 90, o 120 minuto. Ang mga kasama (sa app: counselors) ay naglalathala ng profile, oras, at username sa Venmo.

Ito ay suporta ng kapwa. Ang mga kasama ay hindi lisensiyadong therapist, psychologist, psychiatrist, o tagapagbigay ng medikal na serbisyo. Ang pagbisita ay hindi therapy, diagnosis, o paggamot. Hindi mananagot ang Life Booster sa payo at maaaring tanggalin ang isang kasama nang walang abiso. Sa krisis, tumawag o mag-text sa 988.

## Ano ang magagawa mo

| Tab | Sino | Ano |
|---|---|---|
| Today | Miyembro | I-log ang alinmang araw ngayong linggo, tingnan ang average, magdagdag ng gamot |
| Library | Sinumang naka-sign in | Mga practice ayon sa paksa, mga kasamang susundan, mag-book ng pagbisita |
| Visits | Pareho | Mga paparating at nakaraang appointment, saka ang video room |
| Studio | Kasama | Bio, mga specialty, oras-oras na bayad, oras, username sa Venmo |
| You | Naka-sign in | Pangalan sa display, maliwanag o madilim na anyo |

Ang pag-sign in ay email at password, o Apple. Pribadong nananatili ang mga tala at gamot hanggang markahan ng miyembro na puwedeng ibahagi at buksan ang pagbabahagi para sa pagbisitang iyon.

## Bayad

Ang pag-book ay nagbubukas ng Venmo pay link sa username ng kasama (`venmo.com`, `txn=pay`). Hindi iyon koneksyon ng merchant at hindi nito kinukumpirma ang bayad. Ang Google Pay ay pangalawang opsyon sa pamamagitan ng Payment Request API ng browser. Walang Apple Pay sa booking screen.

Ang opsyonal na diskwento ng sponsor ay 2% (`AD_DISCOUNT` sa [src/lib/life/money.ts](src/lib/life/money.ts)). Ang mga rate ay $15 hanggang $400 kada oras.

## Pagpapatakbo

```bash
npm run dev
```

Nakikinig ang app sa port 8080. Dapat parehong pumasa ang `npm run typecheck` at `npm run build`. Ang mga pagbabago sa schema ay sa bagong file sa ilalim ng [migrations/](migrations/). Huwag i-edit ang migration na nailabas na, maliban para pigilan itong mag-seed muli ng data.

Kung walang `DATABASE_URL`, gumagamit ang server ng naka-embed na Postgres (PGLite) at inilalapat ang [migrations/](migrations/) sa pagsisimula. Kung may `DATABASE_URL`, inilalapat ng `npm run db:migrate` ang parehong mga file sa Neon.

## Ayos

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

Ang parehong gabay, sa Filipino: [arkitektura](docs/fil/ARCHITECTURE.md) at [mga prompt](docs/fil/PROMPTS.md).

Ang mga branch na `main`, `web`, `ios`, at `android` ay nasa iisang commit. I-push ang apat nang magkasama.

## Mga tuntunin ng produkto na madaling masira

- Lumalabas ang kasama sa People lamang kapag `active` ang `standing` at may kahit isang naka-save na oras.
- Ang mga oras ay weekday `0` (Linggo) hanggang `6`, naka-snap sa 30 minuto, at dapat mas huli ang katapusan kaysa sa simula.
- Huwag mag-seed ng halimbawang kasama (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Dalawang switch ang pagbabahagi: minarkahang puwedeng ibahagi ang tala o gamot, at may `share_mood` ang pagbisita. Kung isa ang nakasara, hindi ito nakikita ng kasama.
- Nagsisimula ang timer ng pagbisita kapag sumali ang kabilang tao, at binibilang pababa ang nakareserbang tagal.
- Pinapatugtog ng iPhone ang boses ng kabilang tao sa sarili nitong audio element. Nananatiling naka-mute ang remote na video para hindi maipit ang tunog sa nakatagong larawan.
