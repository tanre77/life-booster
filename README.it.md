# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · **Italiano** · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **Nota:** Questa traduzione è assistita da una macchina. L'inglese è la versione autorevole: [README.md](README.md).

[Come si aggiornano le traduzioni](docs/TRANSLATIONS.md).

Una settimana di come ti senti, e qualcuno con cui parlare. I membri registrano un umore, tengono note, elencano farmaci e prenotano una visita video di 30, 60, 90 o 120 minuti. Gli accompagnatori (nell'app: counselors) pubblicano un profilo, gli orari e un nome utente Venmo.

Questo è supporto tra pari. Gli accompagnatori non sono terapeuti abilitati, né psicologi, né psichiatri, né operatori sanitari. Una visita non è terapia, diagnosi o trattamento. Life Booster non è responsabile dei consigli e può rimuovere un accompagnatore senza preavviso. In una crisi, chiama o invia un messaggio al 988.

## Cosa puoi fare

| Scheda | Chi | Cosa |
|---|---|---|
| Today | Membro | Registrare qualsiasi giorno di questa settimana, vedere la media, aggiungere farmaci |
| Library | Chiunque abbia effettuato l'accesso | Pratiche per argomento, accompagnatori da seguire, prenotare una visita |
| Visits | Entrambi | Appuntamenti futuri e passati, poi la stanza video |
| Studio | Accompagnatore | Biografia, specialità, tariffa oraria, orari, nome utente Venmo |
| You | Con accesso effettuato | Nome visualizzato, aspetto chiaro o scuro |

L'accesso è con e-mail e password, oppure Apple. Note e farmaci restano privati finché il membro non li segna come condivisibili e attiva la condivisione per quella visita.

## Pagamento

La prenotazione apre un link di pagamento Venmo verso il nome utente dell'accompagnatore (`venmo.com`, `txn=pay`). Non è una connessione esercente e non conferma il pagamento. Google Pay è una seconda opzione tramite la Payment Request API del browser. Apple Pay non è offerto nella schermata di prenotazione.

Lo sconto opzionale dello sponsor è del 2% (`AD_DISCOUNT` in [src/lib/life/money.ts](src/lib/life/money.ts)). Le tariffe vanno da $15 a $400 all'ora.

## Avvio

```bash
npm run dev
```

L'app è in ascolto sulla porta 8080. `npm run typecheck` e `npm run build` devono entrambi riuscire. Le modifiche allo schema vanno in un nuovo file sotto [migrations/](migrations/). Non modificare una migrazione già rilasciata, tranne per impedirle di seminare di nuovo i dati.

Senza `DATABASE_URL`, il server usa Postgres incorporato (PGLite) e applica [migrations/](migrations/) all'avvio. Con `DATABASE_URL`, `npm run db:migrate` applica gli stessi file su Neon.

## Disposizione

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

La stessa guida, in italiano: [architettura](docs/it/ARCHITECTURE.md) e [prompt](docs/it/PROMPTS.md).

I branch `main`, `web`, `ios` e `android` restano sullo stesso commit. Fai push di tutti e quattro insieme.

## Regole di prodotto facili da rompere

- Un accompagnatore compare in People solo quando il suo `standing` è `active` e ha almeno un'ora salvata.
- Le ore sono il giorno della settimana `0` (domenica) fino a `6`, allineate a 30 minuti, e la fine deve essere dopo l'inizio.
- Non seminare accompagnatori di esempio (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- La condivisione è due interruttori: la nota o il farmaco è segnato come condivisibile, e la visita ha `share_mood`. Se uno dei due è spento, l'accompagnatore non lo vede.
- Il timer della visita parte quando l'altra persona entra, e conta alla rovescia la durata prenotata.
- L'iPhone riproduce la voce dell'altra persona su un proprio elemento audio. Il video remoto resta muto così il suono non resta bloccato su un'immagine nascosta.
