# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · **Polski** · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **Uwaga:** To tłumaczenie jest wspomagane maszynowo. Angielski jest wersją wiążącą: [README.md](README.md).

[Jak aktualizowane są tłumaczenia](docs/TRANSLATIONS.md).

Tydzień tego, jak się czujesz, i ktoś do rozmowy. Członkowie zapisują nastrój, trzymają notatki, wypisują leki i rezerwują wizytę wideo na 30, 60, 90 lub 120 minut. Osoby wspierające (w aplikacji: counselors) publikują profil, godziny i nazwę użytkownika Venmo.

To wsparcie rówieśnicze. Osoby wspierające nie są licencjonowanymi terapeutami, psychologami, psychiatrami ani świadczeniodawcami medycznymi. Wizyta nie jest terapią, diagnozą ani leczeniem. Life Booster nie odpowiada za rady i może usunąć osobę wspierającą bez uprzedzenia. W kryzysie zadzwoń lub wyślij wiadomość na 988.

## Co możesz zrobić

| Karta | Kto | Co |
|---|---|---|
| Today | Członek | Zapisać dowolny dzień tego tygodnia, zobaczyć średnią, dodać leki |
| Library | Każda zalogowana osoba | Praktyki według tematu, osoby wspierające do obserwowania, rezerwacja wizyty |
| Visits | Oboje | Nadchodzące i minione spotkania, potem pokój wideo |
| Studio | Osoba wspierająca | Biogram, specjalizacje, stawka godzinowa, godziny, nazwa użytkownika Venmo |
| You | Zalogowany | Nazwa wyświetlana, jasny lub ciemny wygląd |

Logowanie to e-mail i hasło albo Apple. Notatki i leki zostają prywatne, dopóki członek nie oznaczy ich jako udostępniane i nie włączy udostępniania dla tej wizyty.

## Płatność

Rezerwacja otwiera link płatności Venmo do nazwy użytkownika osoby wspierającej (`venmo.com`, `txn=pay`). To nie jest połączenie sprzedawcy i nie potwierdza płatności. Google Pay jest drugą opcją przez Payment Request API przeglądarki. Apple Pay nie jest na ekranie rezerwacji.

Opcjonalny rabat sponsora to 2% (`AD_DISCOUNT` w [src/lib/life/money.ts](src/lib/life/money.ts)). Stawki od $15 do $400 za godzinę.

## Uruchomienie

```bash
npm run dev
```

Aplikacja nasłuchuje na porcie 8080. `npm run typecheck` i `npm run build` powinny przejść. Zmiany schematu idą do nowego pliku w [migrations/](migrations/). Nie edytuj migracji, która już wyszła, poza przypadkiem zatrzymania ponownego zasiewu danych.

Bez `DATABASE_URL` serwer używa wbudowanego Postgresa (PGLite) i stosuje [migrations/](migrations/) przy starcie. Z `DATABASE_URL` polecenie `npm run db:migrate` stosuje te same pliki do Neon.

## Układ

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

Ten sam przewodnik po polsku: [architektura](docs/pl/ARCHITECTURE.md) i [prompty](docs/pl/PROMPTS.md).

Gałęzie `main`, `web`, `ios` i `android` trzymane są na tym samym commicie. Wypchnij wszystkie cztery razem.

## Reguły produktu, które łatwo złamać

- Osoba wspierająca pojawia się w People tylko wtedy, gdy `standing` to `active` i jest zapisana co najmniej jedna godzina.
- Godziny to dzień tygodnia `0` (niedziela) do `6`, docięte do 30 minut, a koniec musi być po początku.
- Nie zasiewaj przykładowych osób wspierających (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Udostępnianie to dwa przełączniki: notatka albo lek jest oznaczony jako udostępniany, a wizyta ma `share_mood`. Gdy jeden jest wyłączony, osoba wspierająca tego nie widzi.
- Licznik wizyty startuje, gdy druga osoba dołącza, i odlicza zarezerwowany czas.
- iPhone odtwarza głos drugiej osoby na własnym elemencie audio. Zdalne wideo zostaje wyciszone, żeby dźwięk nie utknął na ukrytym obrazie.
