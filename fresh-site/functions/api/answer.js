const json = (data, status = 200) => Response.json(data, { status });
const isAdmin = (request, env) =>
  Boolean(env.ADMIN_TOKEN) && request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`;

async function searchWeb(query, apiKey) {
  if (!apiKey) return [];
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, search_depth: "basic", max_results: 5, include_answer: false })
  });
  if (!response.ok) throw new Error("Tìm kiếm web hiện không khả dụng.");
  const data = await response.json();
  return (data.results || []).map(item => ({
    title: String(item.title || "Nguồn tham khảo").slice(0, 250),
    url: String(item.url || ""),
    content: String(item.content || "").slice(0, 1800)
  })).filter(item => item.url);
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Mã quản trị không đúng." }, 401);
  if (!env.DB) return json({ error: "Chưa cấu hình D1 binding DB." }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Dữ liệu không hợp lệ." }, 400); }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: "ID câu hỏi không hợp lệ." }, 400);
  const question = await env.DB.prepare("SELECT id, question FROM questions WHERE id = ?").bind(id).first();
  if (!question) return json({ error: "Không tìm thấy câu hỏi." }, 404);

  if (body.action === "approve") {
    const answer = String(body.answer || "").trim();
    if (answer.length < 10) return json({ error: "Câu trả lời quá ngắn." }, 400);
    if (answer.length > 12000) return json({ error: "Câu trả lời vượt quá giới hạn." }, 413);
    await env.DB.prepare(
      "UPDATE questions SET answer = ?, answer_draft = ?, answer_status = 'approved' WHERE id = ?"
    ).bind(answer, answer, id).run();
    return json({ ok: true });
  }

  if (body.action !== "generate") return json({ error: "Thao tác không hợp lệ." }, 400);
  if (!env.AI) return json({ error: "Chưa cấu hình Workers AI binding AI." }, 500);

  const lesson = await env.DB.prepare("SELECT content FROM lesson_content WHERE id = 1").first();
  let sources = [];
  let searchNote = "";
  if (env.TAVILY_API_KEY) {
    try {
      sources = await searchWeb(`${question.question} KTPL 10 kiến thức pháp luật kinh tế`, env.TAVILY_API_KEY);
      searchNote = sources.length ? "Đã có kết quả tìm kiếm web; kiểm tra độ tin cậy trước khi duyệt." : "Không tìm được nguồn web phù hợp.";
    } catch (error) {
      searchNote = "Tìm kiếm web lỗi; bản nháp chỉ dựa trên nội dung bài học và kiến thức mô hình.";
    }
  } else {
    searchNote = "Chưa cấu hình Tavily; bản nháp không có nguồn tìm kiếm web.";
  }

  const sourceText = sources.map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\nTóm tắt: ${s.content}`).join("\n\n");
  const lessonText = String(lesson?.content || "").slice(0, 18000);
  const prompt = [
    "Bạn là trợ lý học tập môn Giáo dục Kinh tế và Pháp luật lớp 10 tại Việt Nam.",
    "Trả lời đúng trọng tâm, dễ hiểu, phù hợp học sinh lớp 10. Ưu tiên tuyệt đối nội dung bài học được cung cấp.",
    "Không tự bịa điều luật, số liệu, trích dẫn hoặc nguồn. Nếu thiếu dữ kiện, nói rõ phần chưa chắc chắn.",
    "Viết bằng tiếng Việt, trình bày thành đoạn ngắn hoặc gạch đầu dòng khi cần.",
    `CÂU HỎI: ${question.question}`,
    `NỘI DUNG BÀI HỌC / SGK DO GIÁO VIÊN CUNG CẤP:\n${lessonText || "(Chưa có nội dung bài học được nhập.)"}`,
    `KẾT QUẢ TÌM KIẾM WEB:\n${sourceText || "(Không có nguồn web.)"}`,
    "Hãy tạo bản nháp trả lời. Cuối câu trả lời, thêm mục 'Lưu ý kiểm tra' nếu thông tin chưa đủ chắc chắn."
  ].join("\n\n");

  const result = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
    messages: [
      { role: "system", content: "Bạn là trợ lý học tập chính xác, thận trọng và không bịa nguồn." },
      { role: "user", content: prompt }
    ],
    max_completion_tokens: 900
  });
  const draft = String(result?.response || result?.output_text || "").trim();
  if (!draft) return json({ error: "AI không trả về nội dung. Thử lại sau." }, 502);

  await env.DB.prepare(
    "UPDATE questions SET answer_draft = ?, sources_json = ?, answer_status = 'draft' WHERE id = ?"
  ).bind(draft, JSON.stringify(sources), id).run();
  return json({ ok: true, draft, sources, search_note: searchNote });
}
