# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · **Nederlands** · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **Let op:** Deze vertaling is machine-ondersteund. Engels is de gezaghebbende versie: [README.md](README.md).

[Hoe vertalingen worden bijgewerkt](docs/TRANSLATIONS.md).

Een week van hoe je je voelt, en iemand om mee te praten. Leden loggen een stemming, bewaren notities, zetten medicijnen op een lijst en boeken een videobezoek van 30, 60, 90 of 120 minuten. Begeleiders (in de app: counselors) publiceren een profiel, uren en een Venmo-gebruikersnaam.

Dit is lotgenotensteun. Begeleiders zijn geen erkende therapeuten, psychologen, psychiaters of medische zorgverleners. Een bezoek is geen therapie, diagnose of behandeling. Life Booster is niet aansprakelijk voor advies en kan een begeleider zonder kennisgeving verwijderen. Bel of sms in een crisis naar 988.

## Wat je kunt doen

| Tab | Wie | Wat |
|---|---|---|
| Today | Lid | Een dag van deze week loggen, het gemiddelde zien, medicijnen toevoegen |
| Library | Iedereen die is aangemeld | Oefeningen per onderwerp, begeleiders om te volgen, een bezoek boeken |
| Visits | Beide | Komende en voorbije afspraken, daarna de videoruimte |
| Studio | Begeleider | Bio, specialismen, uurtarief, uren, Venmo-gebruikersnaam |
| You | Aangemeld | Weergavenaam, lichte of donkere weergave |

Aanmelden is e-mail en wachtwoord, of Apple. Notities en medicijnen blijven privé tot het lid ze als deelbaar markeert en delen voor dat bezoek aanzet.

## Betalen

Boeken opent een Venmo-betaallink naar de gebruikersnaam van de begeleider (`venmo.com`, `txn=pay`). Dat is geen handelaarskoppeling en het bevestigt de betaling niet. Google Pay is een tweede optie via de Payment Request API van de browser. Apple Pay staat niet op het boekscherm.

De optionele sponsorkorting is 2% (`AD_DISCOUNT` in [src/lib/life/money.ts](src/lib/life/money.ts)). Tarieven zijn $15 tot $400 per uur.

## Starten

```bash
npm run dev
```

De app luistert op poort 8080. `npm run typecheck` en `npm run build` moeten allebei slagen. Schemawijzigingen gaan in een nieuw bestand onder [migrations/](migrations/). Bewerk een migratie die al is uitgebracht niet, behalve om te voorkomen dat die gegevens opnieuw inzaait.

Zonder `DATABASE_URL` gebruikt de server ingesloten Postgres (PGLite) en past [migrations/](migrations/) toe bij het starten. Met `DATABASE_URL` past `npm run db:migrate` dezelfde bestanden toe op Neon.

## Indeling

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

Dezelfde gids, in het Nederlands: [architectuur](docs/nl/ARCHITECTURE.md) en [prompts](docs/nl/PROMPTS.md).

De branches `main`, `web`, `ios` en `android` blijven op dezelfde commit. Push alle vier samen.

## Productregels die snel breken

- Een begeleider verschijnt in People alleen als `standing` `active` is en er minstens één uur is opgeslagen.
- Uren zijn weekdag `0` (zondag) tot en met `6`, vastgezet op 30 minuten, en het einde moet na het begin liggen.
- Zaai geen voorbeeldbegeleiders (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Delen is twee schakelaars: de notitie of het medicijn is als deelbaar gemarkeerd, en het bezoek heeft `share_mood`. Staat er één uit, dan ziet de begeleider het niet.
- De bezoektimer start als de ander binnenkomt, en telt de geboekte duur af.
- De iPhone speelt de stem van de ander af op een eigen audio-element. De video op afstand blijft gedempt zodat het geluid niet blijft hangen aan een verborgen beeld.
