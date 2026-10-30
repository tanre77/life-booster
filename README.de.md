# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · **Deutsch** · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **Hinweis:** Diese Übersetzung ist maschinell unterstützt. Englisch ist die maßgebliche Fassung: [README.md](README.md).

[Wie Übersetzungen aktualisiert werden](docs/TRANSLATIONS.md).

Eine Woche dessen, wie du dich fühlst, und jemand zum Reden. Mitglieder tragen eine Stimmung ein, behalten Notizen, listen Medikamente und buchen einen Videobesuch von 30, 60, 90 oder 120 Minuten. Begleitende (in der App: counselors) veröffentlichen ein Profil, Zeiten und einen Venmo-Benutzernamen.

Das ist Unterstützung unter Gleichen. Begleitende sind keine zugelassenen Therapeutinnen oder Therapeuten, keine Psychologinnen oder Psychologen, keine Psychiaterinnen oder Psychiater und keine medizinischen Anbieter. Ein Besuch ist keine Therapie, keine Diagnose und keine Behandlung. Life Booster haftet nicht für Ratschläge und kann Begleitende ohne Ankündigung entfernen. In einer Krise rufe 988 an oder schicke eine SMS.

## Was du tun kannst

| Tab | Wer | Was |
|---|---|---|
| Today | Mitglied | Einen beliebigen Tag dieser Woche eintragen, den Durchschnitt sehen, Medikamente hinzufügen |
| Library | Jede angemeldete Person | Übungen nach Thema, Begleitende zum Folgen, einen Besuch buchen |
| Visits | Beide | Kommende und vergangene Termine, danach der Videoraum |
| Studio | Begleitende | Biografie, Schwerpunkte, Stundensatz, Zeiten, Venmo-Benutzername |
| You | Angemeldet | Anzeigename, helles oder dunkles Erscheinungsbild |

Die Anmeldung ist E-Mail und Passwort, oder Apple. Notizen und Medikamente bleiben privat, bis das Mitglied sie als teilbar markiert und das Teilen für diesen Besuch einschaltet.

## Bezahlung

Die Buchung öffnet einen Venmo-Zahlungslink an den Benutzernamen der begleitenden Person (`venmo.com`, `txn=pay`). Das ist keine Händleranbindung und bestätigt die Zahlung nicht. Google Pay ist eine zweite Möglichkeit über die Payment Request API des Browsers. Apple Pay wird auf dem Buchungsbildschirm nicht angeboten.

Der optionale Sponsor-Rabatt beträgt 2 % (`AD_DISCOUNT` in [src/lib/life/money.ts](src/lib/life/money.ts)). Sätze liegen bei $15 bis $400 pro Stunde.

## Start

```bash
npm run dev
```

Die App lauscht auf Port 8080. `npm run typecheck` und `npm run build` sollen beide durchlaufen. Schemaänderungen kommen in eine neue Datei unter [migrations/](migrations/). Bearbeite eine bereits ausgelieferte Migration nicht, außer um zu verhindern, dass sie Daten erneut einspielt.

Ohne `DATABASE_URL` nutzt der Server eingebettetes Postgres (PGLite) und wendet [migrations/](migrations/) beim Start an. Mit `DATABASE_URL` wendet `npm run db:migrate` dieselben Dateien auf Neon an.

## Aufbau

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

Derselbe Leitfaden auf Deutsch: [Architektur](docs/de/ARCHITECTURE.md) und [Prompts](docs/de/PROMPTS.md).

Die Branches `main`, `web`, `ios` und `android` bleiben auf demselben Commit. Pushe alle vier zusammen.

## Produktregeln, die leicht brechen

- Begleitende erscheinen in People nur, wenn ihr `standing` `active` ist und mindestens eine Stunde gespeichert ist.
- Stunden sind Wochentag `0` (Sonntag) bis `6`, auf 30 Minuten gerastert, und das Ende muss nach dem Anfang liegen.
- Spiele keine Beispiel-Begleitenden ein (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Teilen sind zwei Schalter: Die Notiz oder das Medikament ist als teilbar markiert, und der Besuch hat `share_mood`. Ist einer aus, sieht die begleitende Person es nicht.
- Der Besuchstimer startet, wenn die andere Person beitritt, und zählt die gebuchte Dauer herunter.
- Das iPhone spielt die Stimme der anderen Person auf einem eigenen Audio-Element. Das entfernte Video bleibt stumm, damit der Ton nicht an einem versteckten Bild hängen bleibt.
