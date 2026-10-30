# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · **日本語** · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **注:** この訳は機械支援によるものです。英語版が正式な版です: [README.md](README.md)。

[訳の更新方法](docs/TRANSLATIONS.md).

一週間の気分と、話せる相手。メンバーは気分を記録し、メモを残し、薬を一覧にし、30、60、90、または 120 分のビデオ面談を予約します。カウンセラー（アプリ上の表示: counselors）はプロフィール、対応時間、Venmo のユーザー名を公開します。

これはピアサポートです。カウンセラーは、免許を持つセラピスト、心理士、精神科医、医療提供者ではありません。面談は治療、診断、処置ではありません。Life Booster は助言について責任を負わず、通知なくカウンセラーを停止できます。危機のときは、988 に電話するか、テキストを送ってください。

## できること

| タブ | だれ | 内容 |
|---|---|---|
| Today | メンバー | 今週の任意の日を記録し、平均を見て、薬を追加する |
| Library | サインインしている人 | トピック別のプラクティス、フォローするカウンセラー、面談の予約 |
| Visits | 双方 | これからの予定と過去の予定、その後ビデオルーム |
| Studio | カウンセラー | 略歴、専門、時給、時間、Venmo のユーザー名 |
| You | サインイン済み | 表示名、ライトまたはダークの外観 |

サインインはメールとパスワード、または Apple です。メモと薬は、メンバーが共有可能にし、その面談で共有をオンにするまで非公開のままです。

## 支払い

予約すると、カウンセラーのユーザー名宛ての Venmo 支払いリンクが開きます（`venmo.com`、`txn=pay`）。これは加盟店接続ではなく、支払いの確認もしません。Google Pay は、ブラウザの Payment Request API による第二の方法です。予約画面に Apple Pay はありません。

任意のスポンサー割引は 2% です（`AD_DISCOUNT`、[src/lib/life/money.ts](src/lib/life/money.ts)）。料金は 1 時間 $15 から $400 です。

## 実行

```bash
npm run dev
```

アプリはポート 8080 で待ち受けます。`npm run typecheck` と `npm run build` はどちらも成功する必要があります。スキーマの変更は [migrations/](migrations/) の新しいファイルに置きます。すでに出荷したマイグレーションは、再シードを止める場合を除き編集しないでください。

`DATABASE_URL` がないとき、サーバーは組み込み Postgres（PGLite）を使い、起動時に [migrations/](migrations/) を適用します。`DATABASE_URL` があるとき、`npm run db:migrate` が同じファイルを Neon に適用します。

## 構成

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

日本語版: [アーキテクチャ](docs/ja/ARCHITECTURE.md) と [プロンプト](docs/ja/PROMPTS.md)。

ブランチ `main`、`web`、`ios`、`android` は同じコミットに揃えます。四つを一緒に push します。

## 壊れやすい製品ルール

- カウンセラーが People に出るのは、`standing` が `active` で、保存された時間枠が一つ以上あるときだけです。
- 時間は曜日 `0`（日曜）から `6`、30 分単位に揃え、終了は開始より後でなければなりません。
- サンプルのカウンセラーをシードしないでください（`sample-amira`、`sample-jonah`、`sample-leila`、`sample-mateo`）。
- 共有は二つのスイッチです。メモまたは薬が共有可能になっており、面談に `share_mood` があること。どちらかがオフなら、カウンセラーには見えません。
- 面談タイマーは相手が参加したときに始まり、予約した長さをカウントダウンします。
- iPhone は相手の声を専用の audio 要素で再生します。リモート動画はミュートのままにし、隠れた映像に音が取り残されないようにします。
