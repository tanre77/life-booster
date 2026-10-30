# 架构

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · **简体中文** · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · [Tiếng Việt](../vi/ARCHITECTURE.md) · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **说明：** 本译文由机器辅助完成。英文版为权威版本：[ARCHITECTURE.md](../ARCHITECTURE.md)。

[如何更新译文](../TRANSLATIONS.md).

Life Booster 是一个 TanStack Start 应用。页面在 `src/routes/`。数据变更经过 [src/lib/life/api.ts](../../src/lib/life/api.ts) 里的服务器函数。每个读取或写入某人数据行的函数都使用 `authMiddleware`，并用 `context.userId` 限定 SQL。客户端从不发送用户 id。

## 请求路径

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` 每个进程只应用一次 `migrations/` 里尚未应用的文件。文件按名称排序。`migrations/auth/` 不在这个 glob 里。认证模式是分开的。

## 页面

| 路由 | 文件 | 服务器函数 |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`、`saveMood`、`saveMedication`、`deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth，邮箱与 Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`、`listSlots`、`bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`，消息 |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`、`saveCounselorBio`、`saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`，浏览器中的主题 |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | 操作员列表；第一个登录的人可以领取 desk |

[src/components/shell.tsx](../../src/components/shell.tsx) 里的外壳是那五个标签。视频是全屏舞台，不在标签的内边距里。

## 数据

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

迁移：

| 文件 | 增加的内容 |
|---|---|
| `0001_auth.sql` | 认证表 |
| `0002_life_booster.sql` | 上面那些表，不含 Venmo 和药物 |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | 删除 `sample-%` 行 |
| `0005_medications.sql` | `medications` |

`0002` 曾经插入四名示例陪伴者。那段插入已经没有了。不要加回去。`0004` 会在已经应用旧 `0002` 的数据库上删除他们。

标签（宗教、哲学、专长）是文本列里的 JSON 字符串，不是连接表。允许的专长标签是 [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts) 里的 `SPECIALTIES`。增加专长是目录变更，不是迁移。

## 谁会出现在 People

`loadDirectory` 丢掉任何以 `sample-` 开头的 `user_id`。公开列表只保留 `standing = 'active'` 且至少有一个可用时间块的陪伴者。只保存简介、没有小时，不会把他们列出来。`saveAvailability` 之后，Studio 会使 `["counselors"]` 查询失效。

小时以从午夜起的分钟数存储。表单在 zod 检查 `0…1440` 之前对齐到 30 分钟。空窗口，或结束时间不晚于开始时间的窗口，会被丢掉。什么都没剩下还保存，会抛出 "Add an hour window for at least one day."

## 预约与钱

`sessionPriceCents` 是时薪乘以时长，再除以 60。勾选赞助方框后，该价格乘以 `0.98`。

`bookAppointment` 接受的 `payMethod` 为 `google_pay` 或 `venmo`。Venmo 是预约卡片里拼出的深层链接：

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

用户名存储时不含 `@`，并只保留字母、数字、`_` 和 `-`。没有 Venmo OAuth，也没有付款 webhook。`pay_status` 为 `demo_authorized` 表示链接被打开了，不是 Venmo 确认了款项。

时段来自陪伴者在其时区中的时间块，减去已经预约的会面。时长只有 30、60、90 和 120。

## 心情、笔记、药物

成员可以写最近七天中的任何一天，不只是今天。图表和一周列表都选中 `saveMood` 写入的那一天。

陪伴者只有在下列全部为真时才看得到笔记：

1. 笔记非空。
2. `mood_entries.share_with_counselors` 为真。
3. 该预约的 `share_mood` 为真。
4. 笔记日期落在以拜访日结束的 14 天内。

药物使用同一个拜访开关，再加上自己的分享标记。它们不受那个日期窗口限制。名单是成员写的。它不是处方记录。

如果增加一列，`getDashboard` 仍必须返回心情。这里抛出的查询会让 Today 看起来像保存失败。Today 页面也会在重新获取之前把已保存的心情写入 React Query 缓存，这样慢刷新不会清空图表。

## 视频

[src/components/video-room.tsx](../../src/components/video-room.tsx) 打开摄像头，然后轮询 `call_presence` 和 `call_signals`。成员和陪伴者都会创建 offer。如果双方都有本地 offer，成员保留自己的，陪伴者回退并应答。

计时器在 `remoteLive` 变为真时开始，然后对 `durationMin` 倒计时。录制是可选的、本地的，在混合流上使用 `MediaRecorder`。不会上传。

iPhone 不会从隐藏或静音的视频元素播放远端音频，而稍后的 `play()` 不在那次点按之内。远端 `<video>` 是静音的。单独的 `<audio>` 元素播放声音。如果 `play()` 被拒绝，房间显示 **Tap to hear**。本地预览视频保持静音，这样房间不会回声。

## 外观

浅色是默认。深色设置 `html.dark`，并更换 [src/styles.css](../../src/styles.css) 里的标记。选择从 You 标签存在浏览器里（[src/lib/theme.ts](../../src/lib/theme.ts)）。它不是数据库列。

## 认证

邮箱和密码，加上 Apple，通过 Better Auth。预览宿主不支持的社交按钮应当以可见消息失败，而不是空白屏幕。需要某个人的服务器函数使用 `authMiddleware`。不要信任请求体里的 id。
