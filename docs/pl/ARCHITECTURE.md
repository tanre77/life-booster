# Architektura

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · **Polski** · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **Uwaga:** To tłumaczenie jest wspomagane maszynowo. Angielski jest wersją wiążącą: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Jak aktualizowane są tłumaczenia](../TRANSLATIONS.md).

Life Booster to aplikacja TanStack Start. Strony są w `src/routes/`. Zmiany danych idą przez funkcje serwera w [src/lib/life/api.ts](../../src/lib/life/api.ts). Każda funkcja, która czyta albo zapisuje wiersze osoby, używa `authMiddleware` i ogranicza SQL przez `context.userId`. Klient nigdy nie wysyła id użytkownika.

## Ścieżka żądania

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` stosuje oczekujące pliki z `migrations/` raz na proces. Pliki są uporządkowane po nazwie. `migrations/auth/` nie wchodzi w ten glob. Schemat auth jest osobny.

## Strony

| Ścieżka | Plik | Funkcje serwera |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, e-mail i Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, wiadomości |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, motyw w przeglądarce |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | lista operatorów; pierwsza zalogowana osoba może przejąć desk |

Powłoka w [src/components/shell.tsx](../../src/components/shell.tsx) to pięć kart. Wideo jest sceną pełnoekranową i nie leży w dopełnieniu kart.

## Dane

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

Migracje:

| Plik | Co dodaje |
|---|---|
| `0001_auth.sql` | tabele auth |
| `0002_life_booster.sql` | tabele powyżej, poza Venmo i lekami |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | usuwa wiersze `sample-%` |
| `0005_medications.sql` | `medications` |

`0002` kiedyś wstawiał cztery przykładowe osoby wspierające. Tego wstawienia już nie ma. Nie przywracaj go. `0004` usuwa je w bazach, które już zastosowały stare `0002`.

Tagi (religie, filozofie, specjalizacje) to łańcuchy JSON w kolumnach tekstowych, nie tabele łączące. Dozwolone etykiety specjalizacji to `SPECIALTIES` w [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Dodanie specjalizacji to zmiana katalogu, nie migracja.

## Kto pojawia się w People

`loadDirectory` odrzuca każde `user_id`, które zaczyna się od `sample-`. Lista publiczna zostawia osobę wspierającą tylko gdy `standing = 'active'` i jest co najmniej jeden blok dostępności. Zapis biogramu bez godzin nie umieszcza ich na liście. Po `saveAvailability` Studio unieważnia zapytanie `["counselors"]`.

Godziny są zapisane jako minuty od północy. Formularz docina do 30 minut, zanim zod sprawdzi `0…1440`. Puste okno albo koniec, który nie jest po początku, odpada. Zapis, gdy nic nie zostało, rzuca "Add an hour window for at least one day."

## Rezerwacja i pieniądze

`sessionPriceCents` to stawka godzinowa razy czas trwania, podzielone przez 60. Gdy pole sponsora jest zaznaczone, ta cena jest mnożona przez `0.98`.

`bookAppointment` przyjmuje `payMethod` o wartości `google_pay` albo `venmo`. Venmo to głęboki link budowany na karcie rezerwacji:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

Nazwa użytkownika jest przechowywana bez `@` i obcięta do liter, cyfr, `_` i `-`. Nie ma OAuth Venmo ani webhooka płatności. `pay_status` równe `demo_authorized` znaczy, że link został otwarty, a nie że Venmo potwierdził pieniądze.

Okna pochodzą z bloków osoby wspierającej w jej strefie czasowej, minus już zarezerwowane spotkania. Czasy trwania to tylko 30, 60, 90 i 120.

## Nastrój, notatki, leki

Członek może zapisać dowolny z ostatnich siedmiu dni, nie tylko dziś. Wykres i lista tygodnia wybierają dzień, który zapisuje `saveMood`.

Osoba wspierająca widzi notatkę tylko gdy prawdą jest wszystko to:

1. Notatka nie jest pusta.
2. `mood_entries.share_with_counselors` jest prawdą.
3. `share_mood` spotkania jest prawdą.
4. Data notatki jest w 14 dniach kończących się datą wizyty.

Leki używają tego samego przełącznika wizyty plus własnej flagi udostępniania. Nie są ograniczone do tego okna dat. Listę napisał członek. To nie jest zapis recepty.

`getDashboard` musi dalej zwracać nastroje, jeśli dodasz kolumnę. Zapytanie, które tu rzuca, sprawia, że Today wygląda jak nieudany zapis. Strona Today zapisuje też zapisany nastrój do pamięci podręcznej React Query przed ponownym pobraniem, więc wolne odświeżenie nie czyści wykresu.

## Wideo

[src/components/video-room.tsx](../../src/components/video-room.tsx) otwiera kamerę, potem odpytuje `call_presence` i `call_signals`. Członek i osoba wspierająca oboje tworzą oferty. Jeśli oboje mają lokalną ofertę, członek zostawia swoją, a osoba wspierająca cofa się i odpowiada.

Licznik startuje, gdy `remoteLive` staje się prawdą, potem odlicza `durationMin`. Nagranie jest opcjonalne, lokalne i używa `MediaRecorder` na zmieszanym strumieniu. Nie jest wysyłane.

iPhone nie odtwarza zdalnego dźwięku z ukrytego albo wyciszonego elementu wideo, a późniejsze `play()` jest poza dotknięciem. Zdalny `<video>` jest wyciszony. Osobny element `<audio>` odtwarza głos. Jeśli `play()` zostanie odrzucone, pokój pokazuje **Tap to hear**. Lokalny podgląd zostaje wyciszony, żeby pokój nie niósł echa.

## Wygląd

Jasny jest domyślny. Ciemny ustawia `html.dark` i podmienia tokeny w [src/styles.css](../../src/styles.css). Wybór jest zapisany w przeglądarce z karty You ([src/lib/theme.ts](../../src/lib/theme.ts)). To nie jest kolumna bazy.

## Auth

E-mail i hasło, plus Apple, przez Better Auth. Przyciski społecznościowe, których host podglądu nie obsługuje, mają kończyć się widocznym komunikatem, nie pustym ekranem. Funkcje serwera, które potrzebują osoby, używają `authMiddleware`. Nie ufaj id z treści żądania.
