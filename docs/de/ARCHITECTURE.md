# Architektur

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · **Deutsch** · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **Hinweis:** Diese Übersetzung ist maschinell unterstützt. Englisch ist die maßgebliche Fassung: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Wie Übersetzungen aktualisiert werden](../TRANSLATIONS.md).

Life Booster ist eine TanStack Start-App. Seiten liegen in `src/routes/`. Datenänderungen laufen über Serverfunktionen in [src/lib/life/api.ts](../../src/lib/life/api.ts). Jede Funktion, die Zeilen einer Person liest oder schreibt, nutzt `authMiddleware` und grenzt SQL mit `context.userId` ein. Der Client sendet nie eine Benutzer-ID.

## Anfrageweg

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` wendet ausstehende Dateien aus `migrations/` einmal pro Prozess an. Dateien sind nach Namen geordnet. `migrations/auth/` liegt nicht in diesem Glob. Das Auth-Schema ist getrennt.

## Seiten

| Route | Datei | Serverfunktionen |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, E-Mail und Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, Nachrichten |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, Thema im Browser |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | Operatorliste; die erste angemeldete Person kann den desk beanspruchen |

Die Shell in [src/components/shell.tsx](../../src/components/shell.tsx) sind die fünf Tabs. Video ist eine Vollbildbühne und liegt nicht im Innenabstand der Tabs.

## Daten

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

Migrationen:

| Datei | Was sie hinzufügt |
|---|---|
| `0001_auth.sql` | Auth-Tabellen |
| `0002_life_booster.sql` | die Tabellen oben, außer Venmo und Medikamente |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | löscht Zeilen `sample-%` |
| `0005_medications.sql` | `medications` |

`0002` hat früher vier Beispiel-Begleitende eingefügt. Dieses Insert ist weg. Setze es nicht zurück. `0004` löscht sie auf Datenbanken, die das alte `0002` schon angewendet haben.

Tags (Religionen, Philosophien, Schwerpunkte) sind JSON-Zeichenketten in Textspalten, keine Join-Tabellen. Die erlaubten Schwerpunkt-Bezeichnungen sind `SPECIALTIES` in [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Einen Schwerpunkt hinzuzufügen ist eine Katalogänderung, keine Migration.

## Wer in People erscheint

`loadDirectory` verwirft jede `user_id`, die mit `sample-` beginnt. Die öffentliche Liste behält Begleitende nur, wenn `standing = 'active'` und mindestens ein Verfügbarkeitsblock da ist. Eine Biografie ohne Stunden listet sie nicht. Nach `saveAvailability` invalidiert Studio die Abfrage `["counselors"]`.

Stunden werden als Minuten seit Mitternacht gespeichert. Das Formular rastet auf 30 Minuten ein, bevor zod `0…1440` prüft. Ein leeres Fenster oder ein Ende, das nicht nach dem Anfang liegt, fällt weg. Speichern, wenn nichts übrig ist, wirft "Add an hour window for at least one day."

## Buchung und Geld

`sessionPriceCents` ist Stundensatz mal Dauer, geteilt durch 60. Ist das Sponsorfeld angehakt, wird dieser Preis mit `0.98` multipliziert.

`bookAppointment` nimmt `payMethod` von `google_pay` oder `venmo`. Venmo ist ein Deep Link, den die Buchungskarte baut:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

Der Benutzername wird ohne `@` gespeichert und auf Buchstaben, Ziffern, `_` und `-` reduziert. Es gibt kein Venmo-OAuth und keinen Zahlungs-Webhook. `pay_status` von `demo_authorized` heißt, der Link wurde geöffnet, nicht dass Venmo das Geld bestätigt hat.

Slots kommen aus den Blöcken der begleitenden Person in ihrer Zeitzone, abzüglich schon gebuchter Termine. Dauern sind nur 30, 60, 90 und 120.

## Stimmung, Notizen, Medikamente

Ein Mitglied kann jeden der letzten sieben Tage schreiben, nicht nur heute. Diagramm und Wochenliste wählen beide den Tag, den `saveMood` schreibt.

Begleitende sehen eine Notiz nur, wenn alles hiervon wahr ist:

1. Die Notiz ist nicht leer.
2. `mood_entries.share_with_counselors` ist wahr.
3. `share_mood` des Termins ist wahr.
4. Das Datum der Notiz liegt in den 14 Tagen, die am Besuchstag enden.

Medikamente nutzen denselben Besuchsschalter plus ihre eigene Teilen-Markierung. Sie sind nicht auf dieses Datumsfenster begrenzt. Das Mitglied hat die Liste geschrieben. Es ist keine Verschreibungsakte.

`getDashboard` muss Stimmungen weiter zurückgeben, wenn du eine Spalte hinzufügst. Eine Abfrage, die hier wirft, lässt Today aussehen, als wäre das Speichern fehlgeschlagen. Die Seite Today schreibt die gespeicherte Stimmung auch in den React Query-Cache, bevor sie neu lädt, damit eine langsame Aktualisierung das Diagramm nicht leert.

## Video

[src/components/video-room.tsx](../../src/components/video-room.tsx) öffnet die Kamera und fragt dann `call_presence` und `call_signals` ab. Mitglied und begleitende Person erzeugen beide Offers. Wenn beide ein lokales Offer haben, behält das Mitglied seins und die begleitende Person rollt zurück und antwortet.

Der Timer startet, wenn `remoteLive` wahr wird, und zählt dann `durationMin` herunter. Aufnahme ist optional, lokal und nutzt `MediaRecorder` auf einem gemischten Stream. Sie wird nicht hochgeladen.

Das iPhone spielt entferntes Audio nicht aus einem versteckten oder stummen Video-Element, und ein späteres `play()` liegt außerhalb des Tippens. Das entfernte `<video>` ist stumm. Ein separates `<audio>`-Element spielt die Stimme. Wird `play()` abgelehnt, zeigt der Raum **Tap to hear**. Die lokale Vorschau bleibt stumm, damit der Raum nicht hallt.

## Erscheinungsbild

Hell ist die Vorgabe. Dunkel setzt `html.dark` und tauscht die Tokens in [src/styles.css](../../src/styles.css). Die Wahl liegt im Browser, von der Registerkarte You ([src/lib/theme.ts](../../src/lib/theme.ts)). Es ist keine Datenbankspalte.

## Auth

E-Mail und Passwort, plus Apple, über Better Auth. Soziale Schaltflächen, die der Vorschau-Host nicht unterstützt, sollen mit einer sichtbaren Meldung fehlschlagen, nicht mit einem leeren Bildschirm. Serverfunktionen, die eine Person brauchen, nutzen `authMiddleware`. Vertraue keiner ID aus dem Request-Body.
