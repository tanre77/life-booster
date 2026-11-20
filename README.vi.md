# Life Booster

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [العربية](README.ar.md) · [हिन्दी](README.hi.md) · [Русский](README.ru.md) · **Tiếng Việt** · [Türkçe](README.tr.md) · [Bahasa Indonesia](README.id.md) · [Polski](README.pl.md) · [Nederlands](README.nl.md) · [Українська](README.uk.md) · [Filipino](README.fil.md) · [Kiswahili](README.sw.md)

> **Ghi chú:** Bản dịch này có sự hỗ trợ của máy. Tiếng Anh là bản có thẩm quyền: [README.md](README.md).

[Cách cập nhật bản dịch](docs/TRANSLATIONS.md).

Một tuần về cảm giác của bạn, và một người để trò chuyện. Thành viên ghi tâm trạng, giữ ghi chú, liệt kê thuốc và đặt buổi gặp video 30, 60, 90 hoặc 120 phút. Người đồng hành (trong ứng dụng: counselors) đăng hồ sơ, giờ và tên người dùng Venmo.

Đây là hỗ trợ ngang hàng. Người đồng hành không phải nhà trị liệu có giấy phép, nhà tâm lý, bác sĩ tâm thần hay nhà cung cấp y tế. Buổi gặp không phải trị liệu, chẩn đoán hay điều trị. Life Booster không chịu trách nhiệm về lời khuyên và có thể ngừng một người đồng hành mà không báo trước. Khi khủng hoảng, hãy gọi hoặc nhắn tin tới 988.

## Bạn có thể làm gì

| Thẻ | Ai | Việc gì |
|---|---|---|
| Today | Thành viên | Ghi bất kỳ ngày nào trong tuần này, xem mức trung bình, thêm thuốc |
| Library | Người đã đăng nhập | Bài tập theo chủ đề, người đồng hành để theo dõi, đặt buổi gặp |
| Visits | Cả hai | Cuộc hẹn sắp tới và đã qua, rồi phòng video |
| Studio | Người đồng hành | Tiểu sử, chuyên môn, giá theo giờ, giờ, tên người dùng Venmo |
| You | Đã đăng nhập | Tên hiển thị, giao diện sáng hoặc tối |

Đăng nhập bằng email và mật khẩu, hoặc Apple. Ghi chú và thuốc giữ riêng tư cho đến khi thành viên đánh dấu chúng được chia sẻ và bật chia sẻ cho buổi gặp đó.

## Thanh toán

Đặt lịch mở một liên kết thanh toán Venmo tới tên người dùng của người đồng hành (`venmo.com`, `txn=pay`). Đó không phải kết nối người bán và không xác nhận khoản thanh toán. Google Pay là lựa chọn thứ hai qua Payment Request API của trình duyệt. Apple Pay không có trên màn hình đặt lịch.

Mức giảm tùy chọn của nhà tài trợ là 2% (`AD_DISCOUNT` trong [src/lib/life/money.ts](src/lib/life/money.ts)). Giá từ $15 đến $400 một giờ.

## Chạy

```bash
npm run dev
```

Ứng dụng lắng nghe cổng 8080. `npm run typecheck` và `npm run build` đều phải chạy được. Thay đổi lược đồ đặt trong một tệp mới dưới [migrations/](migrations/). Đừng sửa một migration đã phát hành, trừ khi để ngăn nó gieo lại dữ liệu.

Không có `DATABASE_URL`, máy chủ dùng Postgres nhúng (PGLite) và áp dụng [migrations/](migrations/) khi khởi động. Có `DATABASE_URL`, `npm run db:migrate` áp dụng cùng các tệp lên Neon.

## Bố cục

```text
src/routes/          pages
src/lib/life/        server functions, catalog, money, time
src/components/      shell, mood chart, video room
migrations/          schema, applied in filename order
docs/ARCHITECTURE.md how the pieces fit
docs/PROMPTS.md      tasks with the rules that must not regress
```

Cùng tài liệu, bằng tiếng Việt: [kiến trúc](docs/vi/ARCHITECTURE.md) và [prompt](docs/vi/PROMPTS.md).

Các nhánh `main`, `web`, `ios` và `android` giữ cùng một commit. Push cả bốn cùng lúc.

## Quy tắc sản phẩm dễ làm vỡ

- Người đồng hành chỉ hiện trong People khi `standing` là `active` và có ít nhất một giờ đã lưu.
- Giờ là ngày trong tuần `0` (Chủ Nhật) đến `6`, căn theo 30 phút, và giờ kết thúc phải sau giờ bắt đầu.
- Đừng gieo người đồng hành mẫu (`sample-amira`, `sample-jonah`, `sample-leila`, `sample-mateo`).
- Chia sẻ là hai công tắc: ghi chú hoặc thuốc được đánh dấu chia sẻ được, và buổi gặp có `share_mood`. Tắt một trong hai thì người đồng hành không thấy.
- Bộ đếm buổi gặp bắt đầu khi người kia vào, và đếm ngược thời lượng đã đặt.
- iPhone phát giọng người kia trên phần tử audio riêng. Video từ xa giữ im lặng để âm thanh không kẹt trên hình bị ẩn.
