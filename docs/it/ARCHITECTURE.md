# Architettura

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · **Italiano** · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **Nota:** Questa traduzione è assistita da una macchina. L'inglese è la versione autorevole: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Come si aggiornano le traduzioni](../TRANSLATIONS.md).

Life Booster è un'app TanStack Start. Le pagine stanno in `src/routes/`. I cambiamenti ai dati passano da funzioni server in [src/lib/life/api.ts](../../src/lib/life/api.ts). Ogni funzione che legge o scrive le righe di una persona usa `authMiddleware` e limita l'SQL con `context.userId`. Il client non invia mai un id utente.

## Percorso della richiesta

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` applica i file in sospeso da `migrations/` una volta per processo. I file sono ordinati per nome. `migrations/auth/` non è in quel glob. Lo schema di auth è separato.

## Pagine

| Percorso | File | Funzioni server |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, e-mail e Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, messaggi |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, tema nel browser |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | elenco operatori; la prima persona che accede può reclamare il desk |

La shell in [src/components/shell.tsx](../../src/components/shell.tsx) sono le cinque schede. Il video è un palco a schermo intero e non sta nel padding delle schede.

## Dati

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

Migrazioni:

| File | Cosa aggiunge |
|---|---|
| `0001_auth.sql` | tabelle di auth |
| `0002_life_booster.sql` | le tabelle sopra, tranne Venmo e i farmaci |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | cancella le righe `sample-%` |
| `0005_medications.sql` | `medications` |

`0002` inseriva quattro accompagnatori di esempio. Quell'inserimento non c'è più. Non rimetterlo. `0004` li cancella sui database che hanno già applicato il vecchio `0002`.

I tag (religioni, filosofie, specialità) sono stringhe JSON in colonne di testo, non tabelle di join. Le etichette di specialità consentite sono `SPECIALTIES` in [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Aggiungere una specialità è un cambiamento di catalogo, non una migrazione.

## Chi compare in People

`loadDirectory` scarta ogni `user_id` che inizia con `sample-`. L'elenco pubblico tiene un accompagnatore solo quando `standing = 'active'` e c'è almeno un blocco di disponibilità. Salvare una biografia senza orari non lo elenca. Dopo `saveAvailability`, Studio invalida la query `["counselors"]`.

Le ore sono memorizzate come minuti da mezzanotte. Il modulo allinea a 30 minuti prima che zod controlli `0…1440`. Una finestra vuota, o una fine che non è dopo l'inizio, viene scartata. Salvare senza che resti nulla lancia "Add an hour window for at least one day."

## Prenotazione e denaro

`sessionPriceCents` è la tariffa oraria per la durata, diviso 60. Con la casella dello sponsor selezionata, quel prezzo è moltiplicato per `0.98`.

`bookAppointment` accetta `payMethod` di `google_pay` o `venmo`. Venmo è un deep link costruito nella scheda di prenotazione:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

Il nome utente è memorizzato senza `@` e ridotto a lettere, numeri, `_` e `-`. Non c'è OAuth Venmo né un webhook di pagamento. Un `pay_status` di `demo_authorized` significa che il link è stato aperto, non che Venmo ha confermato il denaro.

Gli slot vengono dai blocchi dell'accompagnatore nel suo fuso orario, meno gli appuntamenti già prenotati. Le durate sono solo 30, 60, 90 e 120.

## Umore, note, farmaci

Un membro può scrivere uno qualsiasi degli ultimi sette giorni, non solo oggi. Il grafico e l'elenco della settimana selezionano entrambi il giorno che `saveMood` scrive.

Un accompagnatore vede una nota solo quando tutto questo è vero:

1. La nota non è vuota.
2. `mood_entries.share_with_counselors` è vero.
3. Lo `share_mood` dell'appuntamento è vero.
4. La data della nota è nei 14 giorni che finiscono alla data della visita.

I farmaci usano lo stesso interruttore della visita più il proprio segno di condivisione. Non sono limitati a quella finestra di date. L'elenco l'ha scritto il membro. Non è una registrazione di prescrizione.

`getDashboard` deve continuare a restituire gli umori se aggiungi una colonna. Una query che lancia qui fa sembrare Today un salvataggio fallito. La pagina Today scrive anche l'umore salvato nella cache di React Query prima di ricaricare, così un aggiornamento lento non svuota il grafico.

## Video

[src/components/video-room.tsx](../../src/components/video-room.tsx) apre la fotocamera, poi interroga `call_presence` e `call_signals`. Il membro e l'accompagnatore creano entrambi offerte. Se entrambi hanno un'offerta locale, il membro tiene la sua e l'accompagnatore torna indietro e risponde.

Il timer parte quando `remoteLive` diventa vero, poi conta alla rovescia `durationMin`. La registrazione è facoltativa, locale, e usa `MediaRecorder` su un flusso miscelato. Non viene caricata.

L'iPhone non riproduce l'audio remoto da un elemento video nascosto o muto, e un `play()` successivo è fuori dal tocco. Il `<video>` remoto è muto. Un elemento `<audio>` separato riproduce la voce. Se `play()` viene rifiutato, la stanza mostra **Tap to hear**. Il video di anteprima locale resta muto così la stanza non fa eco.

## Aspetto

Chiaro è il predefinito. Scuro imposta `html.dark` e scambia i token in [src/styles.css](../../src/styles.css). La scelta è memorizzata nel browser dalla scheda You ([src/lib/theme.ts](../../src/lib/theme.ts)). Non è una colonna del database.

## Auth

E-mail e password, più Apple, tramite Better Auth. I pulsanti social che l'host dell'anteprima non supporta devono fallire con un messaggio visibile, non con uno schermo vuoto. Le funzioni server che hanno bisogno di una persona usano `authMiddleware`. Non fidarti di un id nel corpo della richiesta.
