# Kiến trúc

[English](../ARCHITECTURE.md) · [Español](../es/ARCHITECTURE.md) · [Français](../fr/ARCHITECTURE.md) · [Deutsch](../de/ARCHITECTURE.md) · [Português (Brasil)](../pt-BR/ARCHITECTURE.md) · [Italiano](../it/ARCHITECTURE.md) · [简体中文](../zh-CN/ARCHITECTURE.md) · [繁體中文](../zh-TW/ARCHITECTURE.md) · [日本語](../ja/ARCHITECTURE.md) · [한국어](../ko/ARCHITECTURE.md) · [العربية](../ar/ARCHITECTURE.md) · [हिन्दी](../hi/ARCHITECTURE.md) · [Русский](../ru/ARCHITECTURE.md) · **Tiếng Việt** · [Türkçe](../tr/ARCHITECTURE.md) · [Bahasa Indonesia](../id/ARCHITECTURE.md) · [Polski](../pl/ARCHITECTURE.md) · [Nederlands](../nl/ARCHITECTURE.md) · [Українська](../uk/ARCHITECTURE.md) · [Filipino](../fil/ARCHITECTURE.md) · [Kiswahili](../sw/ARCHITECTURE.md)

> **Ghi chú:** Bản dịch này có sự hỗ trợ của máy. Tiếng Anh là bản có thẩm quyền: [ARCHITECTURE.md](../ARCHITECTURE.md).

[Cách cập nhật bản dịch](../TRANSLATIONS.md).

Life Booster là ứng dụng TanStack Start. Trang nằm ở `src/routes/`. Thay đổi dữ liệu đi qua hàm máy chủ trong [src/lib/life/api.ts](../../src/lib/life/api.ts). Mọi hàm đọc hoặc ghi hàng của một người đều dùng `authMiddleware` và giới hạn SQL bằng `context.userId`. Máy khách không bao giờ gửi id người dùng.

## Đường đi của yêu cầu

```text
page (src/routes)
  → TanStack Query
    → createServerFn in src/lib/life/api.ts
      → authMiddleware (src/lib/auth/middleware.ts)
        → getSql() (src/lib/db.ts)
          → Neon if DATABASE_URL is set, otherwise PGLite
```

`getSql()` áp dụng các tệp đang chờ từ `migrations/` một lần mỗi tiến trình. Tệp được sắp theo tên. `migrations/auth/` không nằm trong glob đó. Lược đồ auth tách riêng.

## Trang

| Tuyến | Tệp | Hàm máy chủ |
|---|---|---|
| `/` | [src/routes/index.tsx](../../src/routes/index.tsx) | `getDashboard`, `saveMood`, `saveMedication`, `deleteMedication` |
| `/login` | [src/routes/login.tsx](../../src/routes/login.tsx) | Better Auth, email và Apple |
| `/counselors` | [src/routes/counselors/index.tsx](../../src/routes/counselors/index.tsx) | `listCounselors` |
| `/counselors/$counselorId` | [src/routes/counselors/$counselorId.tsx](../../src/routes/counselors/$counselorId.tsx) | `getCounselor`, `listSlots`, `bookAppointment` |
| `/visits` | [src/routes/visits.tsx](../../src/routes/visits.tsx) | `listVisits` |
| `/session/$appointmentId` | [src/routes/session/$appointmentId.tsx](../../src/routes/session/$appointmentId.tsx) | `getSessionRoom`, tin nhắn |
| `/studio` | [src/routes/studio.tsx](../../src/routes/studio.tsx) | `getMyCounselor`, `saveCounselorBio`, `saveAvailability` |
| `/you` | [src/routes/you.tsx](../../src/routes/you.tsx) | `saveDisplayName`, giao diện trong trình duyệt |
| `/desk` | [src/routes/desk.tsx](../../src/routes/desk.tsx) | danh sách người vận hành; người đăng nhập đầu tiên có thể nhận desk |

Vỏ trong [src/components/shell.tsx](../../src/components/shell.tsx) là năm thẻ. Video là sân khấu toàn màn hình và không nằm trong phần đệm của thẻ.

## Dữ liệu

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

Migration:

| Tệp | Nó thêm gì |
|---|---|
| `0001_auth.sql` | bảng auth |
| `0002_life_booster.sql` | các bảng ở trên, trừ Venmo và thuốc |
| `0003_venmo.sql` | `counselor_profiles.venmo_handle` |
| `0004_remove_sample_counselors.sql` | xóa các hàng `sample-%` |
| `0005_medications.sql` | `medications` |

`0002` từng chèn bốn người đồng hành mẫu. Lần chèn đó đã mất. Đừng đưa lại. `0004` xóa họ trên các cơ sở dữ liệu đã áp dụng `0002` cũ.

Thẻ (tôn giáo, triết lý, chuyên môn) là chuỗi JSON trong cột văn bản, không phải bảng nối. Nhãn chuyên môn được phép là `SPECIALTIES` trong [src/lib/life/catalog.ts](../../src/lib/life/catalog.ts). Thêm chuyên môn là thay đổi danh mục, không phải migration.

## Ai hiện trong People

`loadDirectory` bỏ mọi `user_id` bắt đầu bằng `sample-`. Danh sách công khai chỉ giữ người đồng hành khi `standing = 'active'` và có ít nhất một khối giờ rảnh. Lưu tiểu sử mà không có giờ thì không liệt kê họ. Sau `saveAvailability`, Studio vô hiệu truy vấn `["counselors"]`.

Giờ được lưu bằng phút kể từ nửa đêm. Biểu mẫu căn 30 phút trước khi zod kiểm `0…1440`. Cửa sổ trống, hoặc giờ kết thúc không sau giờ bắt đầu, bị bỏ. Lưu khi không còn gì sẽ ném "Add an hour window for at least one day."

## Đặt lịch và tiền

`sessionPriceCents` là giá theo giờ nhân thời lượng, chia 60. Khi ô nhà tài trợ được chọn, giá đó nhân `0.98`.

`bookAppointment` nhận `payMethod` là `google_pay` hoặc `venmo`. Venmo là liên kết sâu được dựng trong thẻ đặt lịch:

```text
https://venmo.com/?txn=pay&audience=private&recipients=<username>&amount=<dollars>&note=<visit>
```

Tên người dùng được lưu không có `@` và chỉ còn chữ, số, `_`, và `-`. Không có OAuth Venmo và không có webhook thanh toán. `pay_status` là `demo_authorized` nghĩa là liên kết đã được mở, không phải Venmo đã xác nhận tiền.

Các khung giờ lấy từ khối của người đồng hành theo múi giờ của họ, trừ các cuộc hẹn đã đặt. Thời lượng chỉ 30, 60, 90, và 120.

## Tâm trạng, ghi chú, thuốc

Thành viên có thể viết bất kỳ ngày nào trong bảy ngày gần nhất, không chỉ hôm nay. Biểu đồ và danh sách tuần đều chọn ngày mà `saveMood` ghi.

Người đồng hành chỉ thấy ghi chú khi tất cả điều này đúng:

1. Ghi chú không rỗng.
2. `mood_entries.share_with_counselors` là đúng.
3. `share_mood` của cuộc hẹn là đúng.
4. Ngày của ghi chú nằm trong 14 ngày kết thúc vào ngày buổi gặp.

Thuốc dùng cùng công tắc của buổi gặp cộng cờ chia sẻ riêng. Chúng không bị giới hạn trong cửa sổ ngày đó. Thành viên đã viết danh sách. Đây không phải hồ sơ đơn thuốc.

`getDashboard` phải tiếp tục trả tâm trạng nếu bạn thêm một cột. Truy vấn ném lỗi ở đây khiến Today trông như lưu thất bại. Trang Today cũng ghi tâm trạng đã lưu vào bộ nhớ đệm React Query trước khi lấy lại, nên làm mới chậm không xóa biểu đồ.

## Video

[src/components/video-room.tsx](../../src/components/video-room.tsx) mở camera, rồi hỏi `call_presence` và `call_signals`. Thành viên và người đồng hành đều tạo offer. Nếu cả hai có offer cục bộ, thành viên giữ của mình và người đồng hành lùi lại rồi trả lời.

Bộ đếm bắt đầu khi `remoteLive` thành đúng, rồi đếm ngược `durationMin`. Ghi hình là tùy chọn, cục bộ, và dùng `MediaRecorder` trên luồng trộn. Nó không được tải lên.

iPhone không phát âm thanh từ xa từ phần tử video bị ẩn hoặc tắt tiếng, và `play()` sau đó nằm ngoài lần chạm. `<video>` từ xa bị tắt tiếng. Một phần tử `<audio>` riêng phát giọng nói. Nếu `play()` bị từ chối, phòng hiện **Tap to hear**. Video xem trước cục bộ giữ tắt tiếng để phòng không dội âm.

## Giao diện

Sáng là mặc định. Tối đặt `html.dark` và đổi token trong [src/styles.css](../../src/styles.css). Lựa chọn được lưu trong trình duyệt từ thẻ You ([src/lib/theme.ts](../../src/lib/theme.ts)). Đây không phải cột cơ sở dữ liệu.

## Xác thực

Email và mật khẩu, cùng Apple, qua Better Auth. Nút mạng xã hội mà máy chủ xem trước không hỗ trợ phải thất bại bằng thông báo nhìn thấy được, không phải màn hình trống. Hàm máy chủ cần một người thì dùng `authMiddleware`. Đừng tin id từ thân yêu cầu.
