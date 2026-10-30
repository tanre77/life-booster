# Архитектура

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · **Русский** · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **Примечание:** Этот перевод выполнен с помощью машины. Английский текст — авторитетная версия: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Как обновляются переводы](../TRANSLATIONS.md).

Life Booster — приложение TanStack Start. Страницы лежат в `src/routes/`. Изменения данных идут через серверные функции в [src/lib/life/api.ts](../../src/lib/life/api.ts). Каждая функция, которая читает или пишет строки человека, использует `authMiddleware` и ограничивает SQL через `context.userId`. Клиент никогда не отправляет id пользователя.

## Путь запроса

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` применяет ожидающие файлы из `migrations/` один раз на процесс. Файлы упорядочены по имени. `migrations/auth/` не входит в этот glob. Схема auth отдельная.

## Страницы

| Маршрут | Файл | Серверные функции |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, почта и Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, сообщения |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, тема в браузере |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | список операторов; первый вошедший может забрать desk |

Оболочка в [src/components/shell.tsx](../../src/components/shell.tsx) — это пять вкладок. Видео — полноэкранная сцена и не внутри отступа вкладок.

## Данные

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

Миграции:

| Файл | Что добавляет |
|---|---|
| `0001_auth.sql` | таблицы auth |
| `0002_life_booster.sql` | таблицы выше, кроме Venmo и лекарств |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | удаляет строки `sample-%` |
| `0005_medications.sql` | `medications` |

`0002` раньше вставлял четырёх примерных сопровождающих. Этой вставки больше нет. Не возвращайте её. `0004` удаляет их в базах, которые уже применили старый `0002`.

Метки (религии, философии, специализации) — это JSON-строки в текстовых столбцах, не таблицы связей. Разрешённые подписи специализаций — `SPECIALTIES` в [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Добавить специализацию — изменение каталога, не миграция.

## Кто появляется в People

`loadDirectory` отбрасывает любой `user_id`, который начинается с `sample-`. Публичный список оставляет сопровождающего только когда `standing = 'active'` и есть хотя бы один блок доступности. Сохранение биографии без часов не вносит их в список. После `saveAvailability` Studio инвалидирует запрос `["counselors"]`.

Часы хранятся как минуты от полуночи. Форма привязывает к 30 минутам до того, как zod проверит `0…1440`. Пустое окно или конец, который не позже начала, отбрасывается. Сохранение, когда ничего не осталось, бросает "Add an hour window for at least one day."

## Бронь и деньги

`sessionPriceCents` — почасовая ставка умножить на длительность, делённая на 60. Если флажок спонсора включён, эта цена умножается на `0.98`.

`bookAppointment` принимает `payMethod` со значением `google_pay` или `venmo`. Venmo — это глубокая ссылка, которую собирает карточка брони:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

Имя пользователя хранится без `@` и обрезается до букв, цифр, `_` и `-`. Нет OAuth Venmo и нет вебхука оплаты. `pay_status` со значением `demo_authorized` значит, что ссылку открыли, а не что Venmo подтвердил деньги.

Слоты берутся из блоков сопровождающего в его часовом поясе минус уже забронированные встречи. Длительности только 30, 60, 90 и 120.

## Настроение, заметки, лекарства

Участник может записать любой из последних семи дней, не только сегодня. График и список недели оба выбирают день, который пишет `saveMood`.

Сопровождающий видит заметку только когда верно всё это:

1. Заметка не пустая.
2. `mood_entries.share_with_counselors` истинно.
3. `share_mood` встречи истинно.
4. Дата заметки входит в 14 дней, заканчивающихся датой визита.

Лекарства используют тот же переключатель визита плюс собственный флаг показа. Они не ограничены этим окном дат. Список написал участник. Это не запись рецепта.

`getDashboard` должен продолжать возвращать настроения, если вы добавите столбец. Запрос, который здесь бросает ошибку, делает Today похожим на неудачное сохранение. Страница Today также пишет сохранённое настроение в кэш React Query до повторной загрузки, чтобы медленное обновление не очищало график.

## Видео

[src/components/video-room.tsx](../../src/components/video-room.tsx) открывает камеру, затем опрашивает `call_presence` и `call_signals`. Участник и сопровождающий оба создают offer. Если у обоих есть локальный offer, участник оставляет свой, а сопровождающий откатывается и отвечает.

Таймер начинается, когда `remoteLive` становится истинным, затем отсчитывает `durationMin`. Запись необязательна, локальна и использует `MediaRecorder` на смешанном потоке. Она не загружается.

iPhone не воспроизводит удалённый звук из скрытого или приглушённого элемента video, а более поздний `play()` вне нажатия. Удалённый `<video>` без звука. Отдельный элемент `<audio>` воспроизводит голос. Если `play()` отклонён, комната показывает **Tap to hear**. Локальное превью остаётся без звука, чтобы комната не давала эхо.

## Оформление

Светлое — по умолчанию. Тёмное ставит `html.dark` и меняет токены в [src/styles.css](../../src/styles.css). Выбор хранится в браузере со вкладки You ([src/lib/theme.ts](../../src/lib/theme.ts)). Это не столбец базы данных.

## Auth

Почта и пароль, плюс Apple, через Better Auth. Социальные кнопки, которые хост предпросмотра не поддерживает, должны падать с видимым сообщением, а не с пустым экраном. Серверные функции, которым нужен человек, используют `authMiddleware`. Не доверяйте id из тела запроса.
