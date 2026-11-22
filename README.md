# KTPL 10 – Hỏi & Đáp

Website hỏi đáp lớp học cho **Bài 10 – Lập kế hoạch tài chính cá nhân**, SGK Giáo dục Kinh tế và Pháp luật 10 – Kết nối tri thức với cuộc sống.

## Chức năng
- Học sinh nhập tên và câu hỏi.
- Lưu câu hỏi vào Cloudflare D1, hiển thị danh sách chung.
- Workers AI tạo câu trả lời dựa trên tài liệu Bài 10 do người phụ trách cung cấp.
- Sao chép câu trả lời.
- Khu vực quản trị để cập nhật tài liệu kiến thức.

## Công nghệ và chi phí
- Cloudflare Pages + Pages Functions
- Cloudflare D1
- Cloudflare Workers AI
- GitHub để lưu mã nguồn

Các dịch vụ có hạn mức miễn phí/điều kiện sử dụng riêng và có thể thay đổi theo tài khoản, khu vực, thời điểm. Kiểm tra bảng giá Cloudflare trước khi triển khai; không bật dịch vụ trả phí nếu chưa được người quản lý tài khoản đồng ý.

## Triển khai

### 1. Đưa mã nguồn lên GitHub
1. Tạo repository mới tên `ktpl10-hoi-dap`.
2. Tải toàn bộ thư mục trong gói này lên repository (giữ nguyên cấu trúc).
3. Đặt repository ở chế độ Private nếu chỉ muốn nhóm quản trị xem mã nguồn; website sau khi deploy vẫn có thể công khai.

### 2. Tạo D1 database
1. Đăng nhập Cloudflare Dashboard.
2. Mở **Workers & Pages → D1 SQL Database**.
3. Tạo database tên `ktpl10-hoi-dap`.
4. Sao chép Database ID.
5. Mở `wrangler.toml`, thay `THAY_DATABASE_ID_SAU_KHI_TAO_D1` bằng ID vừa sao chép.
6. Trong D1 Console, chạy toàn bộ nội dung file `schema.sql`.

### 3. Kết nối Cloudflare Pages
1. Mở **Workers & Pages → Create application → Pages → Connect to Git**.
2. Chọn repository `ktpl10-hoi-dap`.
3. Build command để trống.
4. Build output directory: `public`.
5. Deploy.

### 4. Cấu hình bindings và secret
Trong Pages project → **Settings → Functions**:
- D1 database binding: Variable name `DB`, chọn database `ktpl10-hoi-dap`.
- Workers AI binding: Variable name `AI` (nếu giao diện yêu cầu tạo binding riêng, bật Workers AI cho Pages project).
- Environment variable/secret: tạo `ADMIN_TOKEN` với một chuỗi dài, khó đoán. Không chia sẻ mã này cho học sinh.

Nếu cấu hình D1/AI trong `wrangler.toml` chưa tự nhận trên Pages, thêm binding tương ứng trong Settings → Functions → Bindings rồi redeploy.

### 5. Nạp tài liệu Bài 10
1. Mở website sau khi deploy.
2. Mở “Khu vực quản trị lớp”.
3. Nhập `ADMIN_TOKEN`.
4. Dán ghi chú/tóm tắt Bài 10 do giáo viên hoặc lớp cung cấp và được phép sử dụng.
5. Chọn “Lưu tài liệu kiến thức”.

AI chỉ dựa vào phần tài liệu đã nạp. Không nên dán toàn bộ nội dung sách giáo khoa có bản quyền. Hãy dùng ghi chú, tóm tắt do lớp tự soạn hoặc tài liệu được phép chia sẻ.

## Tạo mã QR
Sau khi Pages deploy thành công, sao chép URL dạng `https://ten-du-an.pages.dev` và tạo QR trỏ tới URL đó bằng công cụ tạo QR đáng tin cậy. QR chỉ hoạt động sau khi website đã được xuất bản.

## Lưu ý bảo mật và vận hành
- Không đưa `ADMIN_TOKEN` vào mã nguồn GitHub.
- Website hiển thị tên và câu hỏi cho cả lớp; học sinh không nên nhập dữ liệu cá nhân nhạy cảm.
- Bản khởi tạo chưa có đăng nhập học sinh, kiểm duyệt nội dung, chống spam nâng cao hoặc phân quyền nhiều quản trị viên.
- Người quản trị nên theo dõi nội dung và xóa câu hỏi không phù hợp trực tiếp trong D1 Console.
- Không thể tự động xuất bản vào tài khoản Cloudflare/GitHub của bạn nếu chưa có thao tác cấp quyền và xác nhận từ chủ tài khoản.
