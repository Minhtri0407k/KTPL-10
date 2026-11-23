-- Chỉ chạy MỘT LẦN trên database D1 hiện tại.
-- Sao lưu database trước khi chạy. Không chạy lại nếu các cột đã tồn tại.
ALTER TABLE questions ADD COLUMN answer_draft TEXT NOT NULL DEFAULT '';
ALTER TABLE questions ADD COLUMN sources_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE questions ADD COLUMN answer_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE questions ADD COLUMN answered_directly INTEGER NOT NULL DEFAULT 0;

-- Giữ nguyên câu trả lời cũ và đánh dấu là đã được duyệt.
UPDATE questions
SET answer_status = 'approved'
WHERE answer IS NOT NULL AND trim(answer) <> '';
