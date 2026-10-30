# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · **繁體中文** · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **說明：** 本譯文由機器輔助完成。英文版為權威版本：[README.md](README.md)。

[如何更新譯文](docs/TRANSLATIONS.md).

一週的感受，以及一個可以交談的人。成員記錄心情、保存筆記、列出藥物，並預約 30、60、90 或 120 分鐘的視訊拜訪。陪伴者（應用程式中稱為 counselors）發布個人資料、可約時間和 Venmo 使用者名稱。

這是同儕支持。陪伴者不是持證治療師、心理學家、精神科醫師或醫療服務提供者。一次拜訪不是治療、診斷或處置。Life Booster 不對建議承擔責任，並且可以不經通知停用陪伴者。遇到危機時，請致電或傳送簡訊至 988。

## 你可以做什麼

| 分頁 | 誰 | 做什麼 |
|---|---|---|
| Today | 成員 | 記錄本週任意一天，查看平均值，新增藥物 |
| Library | 任何已登入的人 | 依主題瀏覽練習、可關注的陪伴者、預約拜訪 |
| Visits | 雙方 | 即將到來與已經過去的預約，然後進入視訊房間 |
| Studio | 陪伴者 | 簡介、專長、時薪、時間、Venmo 使用者名稱 |
| You | 已登入 | 顯示名稱、淺色或深色外觀 |

登入方式是電子郵件和密碼，或 Apple。筆記和藥物保持私密，直到成員將其標為可分享，並為該次拜訪開啟分享。

## 付款

預約會開啟指向陪伴者使用者名稱的 Venmo 付款連結（`venmo.com`，`txn=pay`）。這不是商家連線，也不會確認付款。Google Pay 是第二種方式，透過瀏覽器的 Payment Request API。預約畫面不提供 Apple Pay。

可選的贊助折扣為 2%（`AD_DISCOUNT`，見 [src/lib/life/money.ts](src/lib/life/money.ts)）。時薪為每小時 $15 到 $400。

## 執行

```bash
npm run dev
```

應用程式監聽連接埠 8080。`npm run typecheck` 和 `npm run build` 都應通過。綱要變更放在 [migrations/](migrations/) 下的新檔案中。不要修改已經發布的遷移，除非是為了阻止它重新寫入種子資料。

沒有 `DATABASE_URL` 時，伺服器使用內嵌 Postgres（PGLite），並在啟動時套用 [migrations/](migrations/)。有 `DATABASE_URL` 時，`npm run db:migrate` 把同樣的檔案套用到 Neon。

## 佈局

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

繁體中文版：[架構](docs/zh-TW/ARCHITECTURE.md)、[提示](docs/zh-TW/PROMPTS.md)。

分支 `main`、`web`、`ios` 與 `android` 保持在同一次提交上。四個分支一起推送。

## 容易被破壞的產品規則

- 陪伴者只有在 `standing` 為 `active` 且至少儲存了一個小時時段時，才會出現在 People 中。
- 小時以星期 `0`（星期日）到 `6`，對齊到 30 分鐘，結束時間必須晚於開始時間。
- 不要植入示例陪伴者（`sample-amira`、`sample-jonah`、`sample-leila`、`sample-mateo`）。
- 分享是兩個開關：筆記或藥物被標為可分享，並且拜訪帶有 `share_mood`。任一關閉，陪伴者就看不到。
- 拜訪計時器在對方加入時開始，並依預約時長倒數。
- iPhone 用單獨的音訊元素播放對方的聲音。遠端視訊保持靜音，這樣聲音不會卡在被隱藏的畫面上。
