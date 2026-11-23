export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, name, question, answer, created_at FROM questions ORDER BY id DESC LIMIT 100"
    ).all();
    return Response.json({ questions: results || [] });
  } catch (e) {
    return Response.json({ error: "Chưa kết nối được cơ sở dữ liệu. Hãy hoàn tất cấu hình D1." }, { status: 503 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim().slice(0, 40);
    const question = String(body.question || "").trim().slice(0, 1200);
    if (!name || !question) return Response.json({ error: "Vui lòng nhập tên và câu hỏi." }, { status: 400 });
    if (question.length < 5) return Response.json({ error: "Câu hỏi cần có ít nhất 5 ký tự." }, { status: 400 });

    const result = await env.DB.prepare(
      "INSERT INTO questions (name, question, answer) VALUES (?, ?, '')"
    ).bind(name, question).run();
    const id = result.meta.last_row_id;

    let answer = "Chưa thể tạo câu trả lời tự động. Người phụ trách lớp có thể bổ sung tài liệu Bài 10 trong khu vực quản trị.";
    try {
      const lesson = await env.DB.prepare("SELECT content FROM lesson_content WHERE id = 1").first();
      if (lesson?.content && env.AI) {
        const prompt = `Bạn là trợ lý học tập môn Giáo dục Kinh tế và Pháp luật 10. Chỉ được sử dụng dữ liệu kiến thức được cung cấp dưới đây. Không được bịa thêm, không dùng kiến thức ngoài tài liệu để kết luận. Nếu tài liệu không đủ căn cứ, hãy nói rõ: "Tài liệu hiện có chưa đủ thông tin để trả lời chính xác; vui lòng hỏi giáo viên hoặc bổ sung ghi chú Bài 10." Trả lời bằng tiếng Việt, ngắn gọn, rõ ý, phù hợp học sinh lớp 10. Không trích nguyên văn dài.\n\nTÀI LIỆU BÀI 10:\n${lesson.content.slice(0, 18000)}\n\nCÂU HỎI:\n${question}`;
        const output = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "system", content: "Bạn là trợ lý học tập chính xác, thận trọng và chỉ dựa vào nguồn được cung cấp." },
            { role: "user", content: prompt }
          ],
          max_tokens: 500
        });
        answer = output?.response?.trim() || answer;
      } else if (!lesson?.content) {
        answer = "Lớp chưa nhập tài liệu kiến thức Bài 10. Người phụ trách hãy mở mục “Khu vực quản trị lớp” để thêm ghi chú/tóm tắt được phép sử dụng; sau đó gửi lại câu hỏi.";
      }
    } catch (e) {
      answer = "Câu hỏi đã được lưu, nhưng AI chưa thể trả lời. Hãy kiểm tra cấu hình Workers AI và tài liệu Bài 10.";
    }

    await env.DB.prepare("UPDATE questions SET answer = ? WHERE id = ?").bind(answer, id).run();
    return Response.json({ ok: true, id, answer });
  } catch (e) {
    return Response.json({ error: "Không thể lưu câu hỏi. Vui lòng thử lại." }, { status: 500 });
  }
}