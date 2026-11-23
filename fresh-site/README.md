# KTPL 10 — Hỏi đáp bài học

Website hỏi đáp cho một bài KTPL 10, triển khai trên Cloudflare Pages + D1 + Workers AI.

## Tính năng
- Học sinh gửi câu hỏi, xem danh sách câu hỏi và câu trả lời đã được duyệt.
- Quản trị viên đăng nhập bằng mã quản trị riêng.
- Quản trị viên nhập nội dung SGK/tài liệu bài học làm nguồn nền.
- AI chỉ tạo bản nháp khi quản trị viên bấm nút; có thể kết hợp nội dung bài học với kết quả tìm kiếm web qua Tavily.
- Bản nháp, nguồn tham khảo và câu trả lời chỉnh sửa đều được kiểm tra trước khi công khai.
- Có thể đánh dấu câu đã được trả lời trực tiếp trên lớp.

## Cấu hình Cloudflare
1. Trong D1 database mới, chạy toàn bộ `schema.sql` một lần.
2. Trong Cloudflare Pages → Settings → Bindings:
   - D1 database binding: variable name `DB`, chọn database vừa tạo.
   - Workers AI binding: variable name `AI`.
3. Trong Pages → Settings → Variables and Secrets, thêm secrets:
   - `ADMIN_TOKEN`: tự tạo một chuỗi bí mật dài, không dùng mật khẩu nơi khác.
   - `TAVILY_API_KEY`: khóa Tavily nếu muốn bật tìm kiếm web cho AI.
4. Đặt Root directory của Pages là `fresh-site`, Build output directory là `public`. Không cần build command.
5. Giữ thư mục `functions` nằm trong `fresh-site` để Pages nhận các API routes.

## Lưu ý
- AI chỉ tạo bản nháp; không có câu trả lời AI nào tự động công khai.
- Nếu chưa cấu hình `TAVILY_API_KEY`, AI chỉ dùng nội dung bài học và phải ghi rõ giới hạn nguồn.
- Mọi câu trả lời công khai phải được quản trị viên duyệt.
- Không đưa secret vào mã nguồn, README, hoặc gửi qua chat.
