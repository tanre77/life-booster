# アーキテクチャ

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · **日本語** · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **注:** この訳は機械支援によるものです。英語版が正式な版です: [ARCHITECTURE.md](../ARCHITECTURE.md)。

[訳の更新方法](../TRANSLATIONS.md).

Life Booster は TanStack Start のアプリです。ページは `src/routes/` にあります。データの変更は [src/lib/life/api.ts](../../src/lib/life/api.ts) のサーバー関数を通ります。ある人の行を読む、または書く関数はすべて `authMiddleware` を使い、SQL を `context.userId` で範囲限定します。クライアントはユーザー id を送りません。

## リクエストの経路

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` は `migrations/` の未適用ファイルを、プロセスごとに一度適用します。ファイルは名前順です。`migrations/auth/` はその glob に入りません。認証スキーマは別です。

## ページ

| ルート | ファイル | サーバー関数 |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`、`saveMood`、`saveMedication`、`deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth、メールと Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`、`listSlots`、`bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`、メッセージ |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`、`saveCounselorBio`、`saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`、ブラウザ内のテーマ |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | オペレーター一覧。最初にサインインした人が desk を受け取れます |

[src/components/shell.tsx](../../src/components/shell.tsx) のシェルが五つのタブです。ビデオは全画面の舞台で、タブの余白の中にはありません。

## データ

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

マイグレーション:

| ファイル | 追加するもの |
|---|---|
| `0001_auth.sql` | 認証テーブル |
| `0002_life_booster.sql` | 上のテーブル。Venmo と薬を除く |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | `sample-%` の行を削除 |
| `0005_medications.sql` | `medications` |

`0002` は以前、サンプルのカウンセラーを四人挿入していました。その挿入はなくなりました。戻さないでください。`0004` は、古い `0002` をすでに適用したデータベースで彼らを削除します。

タグ（宗教、哲学、専門）はテキスト列の JSON 文字列であり、結合テーブルではありません。許される専門ラベルは [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts) の `SPECIALTIES` です。専門を足すのはカタログの変更であり、マイグレーションではありません。

## People に出る人

`loadDirectory` は `sample-` で始まる `user_id` を落とします。公開リストは、`standing = 'active'` で、空き時間のブロックが一つ以上あるカウンセラーだけを残します。時間なしで略歴を保存しても一覧には出ません。`saveAvailability` のあと、Studio は `["counselors"]` クエリを無効化します。

時間は真夜中からの分数で保存されます。フォームは zod が `0…1440` を調べる前に 30 分へ揃えます。空の窓、または終了が開始より後でない窓は捨てられます。何も残っていない状態で保存すると "Add an hour window for at least one day." が投げられます。

## 予約とお金

`sessionPriceCents` は時給かける長さを 60 で割ったものです。スポンサーの箱がオンなら、その価格に `0.98` を掛けます。

`bookAppointment` は `payMethod` として `google_pay` または `venmo` を受け取ります。Venmo は予約カードが組むディープリンクです:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

ユーザー名は `@` なしで保存され、文字、数字、`_`、`-` に削られます。Venmo の OAuth も支払い webhook もありません。`pay_status` が `demo_authorized` なのは、リンクが開かれたという意味であり、Venmo がお金を確認したという意味ではありません。

枠は、カウンセラーのタイムゾーンにあるブロックから、すでに予約された面談を引いたものです。長さは 30、60、90、120 だけです。

## 気分、メモ、薬

メンバーは今日だけでなく、直近七日のうちどれでも書けます。チャートと週のリストは、どちらも `saveMood` が書く日を選びます。

カウンセラーがメモを見るのは、次がすべて真のときだけです:

1. メモが空でない。
2. `mood_entries.share_with_counselors` が真。
3. 予約の `share_mood` が真。
4. メモの日付が、面談日で終わる 14 日の中にある。

薬は同じ面談スイッチに、自分の共有フラグを足して使います。その日付の窓には限りません。リストを書いたのはメンバーです。処方の記録ではありません。

列を足しても、`getDashboard` は気分を返し続けなければなりません。ここで投げられたクエリは、Today を保存失敗のように見せます。Today のページは再取得の前に、保存した気分を React Query のキャッシュへ書くので、遅い更新でもチャートは消えません。

## ビデオ

[src/components/video-room.tsx](../../src/components/video-room.tsx) はカメラを開き、その後 `call_presence` と `call_signals` をポーリングします。メンバーとカウンセラーはどちらも offer を作ります。両方にローカル offer があるとき、メンバーは自分のを残し、カウンセラーは巻き戻して応答します。

タイマーは `remoteLive` が真になったときに始まり、`durationMin` をカウントダウンします。録画は任意でローカル、混合ストリーム上の `MediaRecorder` を使います。アップロードされません。

iPhone は、隠れた、またはミュートの video 要素からリモート音声を再生せず、後からの `play()` はタップの外です。リモートの `<video>` はミュートです。別の `<audio>` 要素が声を再生します。`play()` が拒否されると、部屋は **Tap to hear** を出します。ローカルのプレビュー動画はミュートのままにし、部屋が反響しないようにします。

## 外観

ライトが既定です。ダークは `html.dark` を置き、[src/styles.css](../../src/styles.css) のトークンを入れ替えます。選択は You タブからブラウザに保存されます（[src/lib/theme.ts](../../src/lib/theme.ts)）。データベースの列ではありません。

## 認証

メールとパスワード、それに Apple。Better Auth を通します。プレビューのホストが対応しないソーシャルボタンは、空白の画面ではなく、見えるメッセージで失敗すべきです。人を必要とするサーバー関数は `authMiddleware` を使います。リクエスト本文の id を信用しないでください。
