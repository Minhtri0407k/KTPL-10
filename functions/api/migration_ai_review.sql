-- CHỈ CHẠY MỘT LẦN trên D1 hiện có.
-- Không chạy lại nếu các cột answer_draft, sources_json, answer_status đã tồn tại.
ALTER TABLE questions ADD COLUMN answer_draft TEXT NOT NULL DEFAULT '';
ALTER TABLE questions ADD COLUMN sources_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE questions ADD COLUMN answer_status TEXT NOT NULL DEFAULT 'pending';

-- Giữ nguyên các câu trả lời cũ đã có, coi chúng là đã được duyệt.
UPDATE questions
SET answer_status = 'approved'
WHERE answer IS NOT NULL AND trim(answer) <> '';
