# 아키텍처

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · **한국어** · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **참고:** 이 번역은 기계 보조로 작성되었습니다. 영어본이 기준입니다: [ARCHITECTURE.md](../ARCHITECTURE.md).

[번역을 업데이트하는 방법](../TRANSLATIONS.md).

Life Booster는 TanStack Start 앱입니다. 페이지는 `src/routes/`에 있습니다. 데이터 변경은 [src/lib/life/api.ts](../../src/lib/life/api.ts)의 서버 함수를 거칩니다. 어떤 사람의 행을 읽거나 쓰는 함수는 모두 `authMiddleware`를 쓰고, SQL을 `context.userId`로 한정합니다. 클라이언트는 사용자 id를 보내지 않습니다.

## 요청 경로

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()`은 `migrations/`의 대기 중인 파일을 프로세스마다 한 번 적용합니다. 파일은 이름순입니다. `migrations/auth/`는 그 glob에 없습니다. 인증 스키마는 따로입니다.

## 페이지

| 경로 | 파일 | 서버 함수 |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, 이메일과 Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, 메시지 |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, 브라우저의 테마 |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | 운영자 목록. 처음 로그인한 사람이 desk를 받을 수 있습니다 |

[src/components/shell.tsx](../../src/components/shell.tsx)의 셸이 다섯 탭입니다. 영상은 전체 화면 무대이며 탭 안쪽 여백 안에 있지 않습니다.

## 데이터

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

마이그레이션:

| 파일 | 추가하는 것 |
|---|---|
| `0001_auth.sql` | 인증 테이블 |
| `0002_life_booster.sql` | 위의 테이블. Venmo와 약은 제외 |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | `sample-%` 행을 삭제 |
| `0005_medications.sql` | `medications` |

`0002`는 예전에 샘플 카운셀러 네 명을 넣었습니다. 그 삽입은 없어졌습니다. 되돌리지 마세요. `0004`는 옛 `0002`를 이미 적용한 데이터베이스에서 그들을 지웁니다.

태그(종교, 철학, 전문 분야)는 텍스트 열의 JSON 문자열이며, 조인 테이블이 아닙니다. 허용된 전문 분야 라벨은 [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts)의 `SPECIALTIES`입니다. 전문 분야를 더하는 것은 카탈로그 변경이지 마이그레이션이 아닙니다.

## People에 나오는 사람

`loadDirectory`는 `sample-`로 시작하는 `user_id`를 버립니다. 공개 목록은 `standing = 'active'`이고 가용 시간 블록이 하나 이상인 카운셀러만 남깁니다. 시간 없이 소개만 저장하면 목록에 나오지 않습니다. `saveAvailability` 뒤에 Studio는 `["counselors"]` 쿼리를 무효화합니다.

시간은 자정부터의 분으로 저장됩니다. 폼은 zod가 `0…1440`을 검사하기 전에 30분으로 맞춥니다. 빈 창이거나, 끝이 시작보다 뒤가 아닌 창은 버려집니다. 남은 것이 없는 채로 저장하면 "Add an hour window for at least one day."가 던져집니다.

## 예약과 돈

`sessionPriceCents`는 시간당 요금 곱하기 길이를 60으로 나눈 값입니다. 스폰서 칸이 켜져 있으면 그 가격에 `0.98`을 곱합니다.

`bookAppointment`는 `payMethod`로 `google_pay` 또는 `venmo`를 받습니다. Venmo는 예약 카드가 만드는 딥 링크입니다:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

사용자 이름은 `@` 없이 저장되고, 글자, 숫자, `_`, `-`만 남깁니다. Venmo OAuth도 결제 webhook도 없습니다. `pay_status`가 `demo_authorized`인 것은 링크가 열렸다는 뜻이지, Venmo가 돈을 확인했다는 뜻이 아닙니다.

슬롯은 카운셀러의 시간대에 있는 블록에서, 이미 예약된 방문을 뺀 것입니다. 길이는 30, 60, 90, 120만 있습니다.

## 기분, 노트, 약

멤버는 오늘만이 아니라 최근 7일 중 아무 날이나 쓸 수 있습니다. 차트와 주간 목록은 둘 다 `saveMood`가 쓰는 날을 고릅니다.

카운셀러가 노트를 보는 것은 다음이 모두 참일 때뿐입니다:

1. 노트가 비어 있지 않다.
2. `mood_entries.share_with_counselors`가 참이다.
3. 예약의 `share_mood`가 참이다.
4. 노트 날짜가 방문일로 끝나는 14일 안에 있다.

약은 같은 방문 스위치에 자신의 공유 표시를 더해 씁니다. 그 날짜 창으로 제한되지 않습니다. 목록은 멤버가 썼습니다. 처방전 기록이 아닙니다.

열을 추가해도 `getDashboard`는 기분을 계속 돌려줘야 합니다. 여기서 던져진 쿼리는 Today를 저장 실패처럼 보이게 합니다. Today 페이지는 다시 가져오기 전에 저장된 기분을 React Query 캐시에 쓰므로, 느린 새로고침이 차트를 비우지 않습니다.

## 영상

[src/components/video-room.tsx](../../src/components/video-room.tsx)는 카메라를 연 다음 `call_presence`와 `call_signals`를 폴링합니다. 멤버와 카운셀러가 둘 다 offer를 만듭니다. 둘 다 로컬 offer가 있으면 멤버는 자기 것을 남기고 카운셀러는 되돌린 뒤 응답합니다.

타이머는 `remoteLive`가 참이 될 때 시작하고, `durationMin`을 카운트다운합니다. 녹화는 선택 사항이고 로컬이며, 섞인 스트림에서 `MediaRecorder`를 씁니다. 업로드되지 않습니다.

iPhone은 숨겨졌거나 음소거된 video 요소에서 원격 오디오를 재생하지 않으며, 나중의 `play()`는 탭 밖에 있습니다. 원격 `<video>`는 음소거입니다. 별도의 `<audio>` 요소가 목소리를 재생합니다. `play()`가 거부되면 방은 **Tap to hear**를 보여 줍니다. 로컬 미리보기 영상은 음소거로 두어 방이 울리지 않게 합니다.

## 모습

밝은 테마가 기본입니다. 어두운 테마는 `html.dark`를 두고 [src/styles.css](../../src/styles.css)의 토큰을 바꿉니다. 선택은 You 탭에서 브라우저에 저장됩니다 ([src/lib/theme.ts](../../src/lib/theme.ts)). 데이터베이스 열이 아닙니다.

## 인증

이메일과 비밀번호, 그리고 Apple. Better Auth를 통합니다. 미리보기 호스트가 지원하지 않는 소셜 버튼은 빈 화면이 아니라 보이는 메시지로 실패해야 합니다. 사람이 필요한 서버 함수는 `authMiddleware`를 씁니다. 요청 본문의 id를 믿지 마세요.
