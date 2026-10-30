# 架構

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · **繁體中文** · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **說明：** 本譯文由機器輔助完成。英文版為權威版本：[ARCHITECTURE.md](../ARCHITECTURE.md)。

[如何更新譯文](../TRANSLATIONS.md).

Life Booster 是一個 TanStack Start 應用程式。頁面在 `src/routes/`。資料變更經過 [src/lib/life/api.ts](../../src/lib/life/api.ts) 裡的伺服器函式。每個讀取或寫入某人資料列的函式都使用 `authMiddleware`，並用 `context.userId` 限定 SQL。用戶端從不傳送使用者 id。

## 請求路徑

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` 每個處理程序只套用一次 `migrations/` 裡尚未套用的檔案。檔案依名稱排序。`migrations/auth/` 不在這個 glob 裡。認證綱要是分開的。

## 頁面

| 路由 | 檔案 | 伺服器函式 |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`、`saveMood`、`saveMedication`、`deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth，電子郵件與 Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`、`listSlots`、`bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`，訊息 |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`、`saveCounselorBio`、`saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`，瀏覽器中的主題 |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | 操作員清單；第一個登入的人可以領取 desk |

[src/components/shell.tsx](../../src/components/shell.tsx) 裡的外殼是那五個分頁。視訊是全螢幕舞台，不在分頁的內距裡。

## 資料

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

遷移：

| 檔案 | 增加的內容 |
|---|---|
| `0001_auth.sql` | 認證表 |
| `0002_life_booster.sql` | 上面那些表，不含 Venmo 和藥物 |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | 刪除 `sample-%` 列 |
| `0005_medications.sql` | `medications` |

`0002` 曾經插入四名示例陪伴者。那段插入已經沒有了。不要加回去。`0004` 會在已經套用舊 `0002` 的資料庫上刪除他們。

標籤（宗教、哲學、專長）是文字欄裡的 JSON 字串，不是連接表。允許的專長標籤是 [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts) 裡的 `SPECIALTIES`。增加專長是目錄變更，不是遷移。

## 誰會出現在 People

`loadDirectory` 丟掉任何以 `sample-` 開頭的 `user_id`。公開清單只保留 `standing = 'active'` 且至少有一個可用時間區塊的陪伴者。只儲存簡介、沒有小時，不會把他們列出來。`saveAvailability` 之後，Studio 會使 `["counselors"]` 查詢失效。

小時以從午夜起的分鐘數儲存。表單在 zod 檢查 `0…1440` 之前對齊到 30 分鐘。空視窗，或結束時間不晚於開始時間的視窗，會被丟掉。什麼都沒剩下還儲存，會擲出 "Add an hour window for at least one day."

## 預約與錢

`sessionPriceCents` 是時薪乘以時長，再除以 60。勾選贊助方塊後，該價格乘以 `0.98`。

`bookAppointment` 接受的 `payMethod` 為 `google_pay` 或 `venmo`。Venmo 是預約卡片裡組出的深層連結：

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

使用者名稱儲存時不含 `@`，並只保留字母、數字、`_` 和 `-`。沒有 Venmo OAuth，也沒有付款 webhook。`pay_status` 為 `demo_authorized` 表示連結被開啟了，不是 Venmo 確認了款項。

時段來自陪伴者在其時區中的時間區塊，減去已經預約的會面。時長只有 30、60、90 和 120。

## 心情、筆記、藥物

成員可以寫最近七天中的任何一天，不只是今天。圖表和一週清單都選中 `saveMood` 寫入的那一天。

陪伴者只有在下列全部為真時才看得到筆記：

1. 筆記非空。
2. `mood_entries.share_with_counselors` 為真。
3. 該預約的 `share_mood` 為真。
4. 筆記日期落在以拜訪日結束的 14 天內。

藥物使用同一個拜訪開關，再加上自己的分享標記。它們不受那個日期視窗限制。名單是成員寫的。它不是處方紀錄。

如果增加一欄，`getDashboard` 仍必須傳回心情。這裡擲出的查詢會讓 Today 看起來像儲存失敗。Today 頁面也會在重新取得之前把已儲存的心情寫入 React Query 快取，這樣慢重新整理不會清空圖表。

## 視訊

[src/components/video-room.tsx](../../src/components/video-room.tsx) 開啟攝影機，然後輪詢 `call_presence` 和 `call_signals`。成員和陪伴者都會建立 offer。如果雙方都有本地 offer，成員保留自己的，陪伴者回退並應答。

計時器在 `remoteLive` 變為真時開始，然後對 `durationMin` 倒數。錄製是可選的、本地的，在混合串流上使用 `MediaRecorder`。不會上傳。

iPhone 不會從隱藏或靜音的視訊元素播放遠端音訊，而稍後的 `play()` 不在那次點按之內。遠端 `<video>` 是靜音的。單獨的 `<audio>` 元素播放聲音。如果 `play()` 被拒絕，房間顯示 **Tap to hear**。本地預覽視訊保持靜音，這樣房間不會回音。

## 外觀

淺色是預設。深色設定 `html.dark`，並更換 [src/styles.css](../../src/styles.css) 裡的標記。選擇從 You 分頁存在瀏覽器裡（[src/lib/theme.ts](../../src/lib/theme.ts)）。它不是資料庫欄。

## 認證

電子郵件和密碼，加上 Apple，透過 Better Auth。預覽宿主不支援的社交按鈕應當以可見訊息失敗，而不是空白畫面。需要某一個人的伺服器函式使用 `authMiddleware`。不要信任請求本文裡的 id。
