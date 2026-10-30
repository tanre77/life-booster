# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · **한국어** · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **참고:** 이 번역은 기계 보조로 작성되었습니다. 영어본이 기준입니다: [README.md](README.md).

[번역을 업데이트하는 방법](docs/TRANSLATIONS.md).

일주일 동안의 기분, 그리고 이야기할 사람. 멤버는 기분을 기록하고, 노트를 남기고, 약을 목록으로 적고, 30, 60, 90 또는 120분 영상 방문을 예약합니다. 카운셀러(앱에서의 이름: counselors)는 프로필, 시간, Venmo 사용자 이름을 공개합니다.

이것은 동료 지원입니다. 카운셀러는 면허를 가진 치료사, 심리학자, 정신과 의사 또는 의료 제공자가 아닙니다. 방문은 치료, 진단 또는 처치가 아닙니다. Life Booster는 조언에 대해 책임지지 않으며, 통지 없이 카운셀러를 해제할 수 있습니다. 위기 상황에서는 988로 전화하거나 문자를 보내세요.

## 할 수 있는 일

| 탭 | 누구 | 내용 |
|---|---|---|
| Today | 멤버 | 이번 주 아무 날이나 기록하고, 평균을 보고, 약을 추가 |
| Library | 로그인한 사람 | 주제별 실천, 팔로우할 카운셀러, 방문 예약 |
| Visits | 양쪽 | 예정된 예약과 지난 예약, 그다음 영상 방 |
| Studio | 카운셀러 | 소개, 전문 분야, 시간당 요금, 시간, Venmo 사용자 이름 |
| You | 로그인함 | 표시 이름, 밝은 또는 어두운 모습 |

로그인은 이메일과 비밀번호, 또는 Apple입니다. 노트와 약은 멤버가 공유 가능으로 표시하고 그 방문의 공유를 켜기 전까지 비공개로 남습니다.

## 결제

예약하면 카운셀러의 사용자 이름으로 Venmo 결제 링크가 열립니다 (`venmo.com`, `txn=pay`). 이것은 판매자 연결이 아니며 결제를 확인하지도 않습니다. Google Pay는 브라우저 Payment Request API를 통한 두 번째 방법입니다. 예약 화면에는 Apple Pay가 없습니다.

선택적 스폰서 할인은 2%입니다 (`AD_DISCOUNT`, [src/lib/life/money.ts](src/lib/life/money.ts)). 요금은 시간당 $15에서 $400입니다.

## 실행

```bash
npm run dev
```

앱은 포트 8080에서 수신합니다. `npm run typecheck`와 `npm run build`가 모두 통과해야 합니다. 스키마 변경은 [migrations/](migrations/) 아래의 새 파일에 둡니다. 이미 배포된 마이그레이션은 데이터를 다시 시드하지 못하게 막는 경우를 제외하고 편집하지 마세요.

`DATABASE_URL`이 없으면 서버는 내장 Postgres(PGLite)를 쓰고 시작 시 [migrations/](migrations/)를 적용합니다. `DATABASE_URL`이 있으면 `npm run db:migrate`가 같은 파일을 Neon에 적용합니다.

## 구성

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

한국어판: [아키텍처](docs/ko/ARCHITECTURE.md), [프롬프트](docs/ko/PROMPTS.md).

브랜치 `main`, `web`, `ios`, `android`는 같은 커밋에 둡니다. 네 개를 함께 push 하세요.

## 깨지기 쉬운 제품 규칙

- 카운셀러는 `standing`이 `active`이고 저장된 시간대가 하나 이상일 때만 People에 나타납니다.
- 시간은 요일 `0`(일요일)부터 `6`까지이며, 30분 단위로 맞추고, 끝은 시작보다 뒤여야 합니다.
- 샘플 카운셀러를 시드하지 마세요 (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- 공유는 스위치 두 개입니다. 노트 또는 약이 공유 가능으로 표시되고, 방문에 `share_mood`가 있어야 합니다. 하나라도 꺼져 있으면 카운셀러에게 보이지 않습니다.
- 방문 타이머는 상대가 들어올 때 시작하고, 예약한 시간만큼 카운트다운합니다.
- iPhone은 상대의 목소리를 별도의 audio 요소에서 재생합니다. 원격 영상은 음소거로 두어, 숨겨진 화면에 소리가 갇히지 않게 합니다.
