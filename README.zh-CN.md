# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · **简体中文** · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **说明：** 本译文由机器辅助完成。英文版为权威版本：[README.md](README.md)。

[如何更新译文](docs/TRANSLATIONS.md).

一周的感受，以及一个可以交谈的人。成员记录心情、保存笔记、列出药物，并预约 30、60、90 或 120 分钟的视频拜访。陪伴者（应用中称为 counselors）发布个人资料、可约时间和 Venmo 用户名。

这是同伴支持。陪伴者不是持证治疗师、心理学家、精神科医生或医疗服务提供者。一次拜访不是治疗、诊断或处置。Life Booster 不对建议承担责任，并且可以不经通知停用陪伴者。遇到危机时，请致电或发短信至 988。

## 你可以做什么

| 标签 | 谁 | 做什么 |
|---|---|---|
| Today | 成员 | 记录本周任意一天，查看平均值，添加药物 |
| Library | 任何已登录的人 | 按主题浏览练习、可关注的陪伴者、预约拜访 |
| Visits | 双方 | 即将到来和已经过去的预约，然后进入视频房间 |
| Studio | 陪伴者 | 简介、专长、时薪、时间、Venmo 用户名 |
| You | 已登录 | 显示名称、浅色或深色外观 |

登录方式是电子邮箱和密码，或 Apple。笔记和药物保持私密，直到成员将其标为可分享，并为该次拜访打开分享。

## 付款

预约会打开指向陪伴者用户名的 Venmo 付款链接（`venmo.com`，`txn=pay`）。这不是商户连接，也不会确认付款。Google Pay 是第二种方式，通过浏览器的 Payment Request API。预约界面不提供 Apple Pay。

可选的赞助折扣为 2%（`AD_DISCOUNT`，见 [src/lib/life/money.ts](src/lib/life/money.ts)）。时薪为每小时 $15 到 $400。

## 运行

```bash
npm run dev
```

应用监听端口 8080。`npm run typecheck` 和 `npm run build` 都应通过。模式变更放在 [migrations/](migrations/) 下的新文件中。不要修改已经发布的迁移，除非是为了阻止它重新写入种子数据。

没有 `DATABASE_URL` 时，服务器使用内嵌 Postgres（PGLite），并在启动时应用 [migrations/](migrations/)。有 `DATABASE_URL` 时，`npm run db:migrate` 把同样的文件应用到 Neon。

## 布局

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

简体中文版：[架构](docs/zh-CN/ARCHITECTURE.md)、[提示](docs/zh-CN/PROMPTS.md)。

分支 `main`、`web`、`ios` 和 `android` 保持在同一次提交上。四个分支一起推送。

## 容易被破坏的产品规则

- 陪伴者只有在 `standing` 为 `active` 且至少保存了一个小时时段时，才会出现在 People 中。
- 小时按星期 `0`（星期日）到 `6`，对齐到 30 分钟，结束时间必须晚于开始时间。
- 不要种入示例陪伴者（`sample-amira`、`sample-jonah`、`sample-leila`、`sample-mateo`）。
- 分享是两个开关：笔记或药物被标为可分享，并且拜访带有 `share_mood`。任一关闭，陪伴者就看不到。
- 拜访计时器在对方加入时开始，并按预约时长倒计时。
- iPhone 用单独的音频元素播放对方的声音。远程视频保持静音，这样声音不会卡在被隐藏的画面上。
