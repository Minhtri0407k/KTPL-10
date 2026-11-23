function authorized(request, env) {
  const token = request.headers.get("Authorization") || "";
  return Boolean(env.ADMIN_TOKEN) && token === `Bearer ${env.ADMIN_TOKEN}`;
}

export async function onRequestGet({ request, env }) {
  try {
    const isAdmin = new URL(request.url).searchParams.get("admin") === "1";
    if (isAdmin && !authorized(request, env)) {
      return Response.json({ error: "Mã quản trị không đúng." }, { status: 401 });
    }

    if (isAdmin) {
      const { results } = await env.DB.prepare(
        `SELECT id, name, question, answer, answer_draft, sources_json,
                answer_status, created_at
         FROM questions ORDER BY id DESC LIMIT 200`
      ).all();
      return Response.json({ questions: results || [] });
    }

    const { results } = await env.DB.prepare(
      `SELECT id, name, question,
              answer, answer_status, created_at
       FROM questions ORDER BY id DESC LIMIT 200`
    ).all();
    return Response.json({ questions: results || [] });
  } catch (e) {
    return Response.json(
      { error: "Chưa kết nối được cơ sở dữ liệu D1. Hãy kiểm tra binding DB và cấu trúc bảng." },
      { status: 503 }
    );
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim().slice(0, 40);
    const question = String(body.question || "").trim().slice(0, 1200);

    if (!name || !question) {
      return Response.json({ error: "Vui lòng nhập tên và câu hỏi." }, { status: 400 });
    }
    if (question.length < 5) {
      return Response.json({ error: "Câu hỏi cần có ít nhất 5 ký tự." }, { status: 400 });
    }

    const result = await env.DB.prepare(
      `INSERT INTO questions
       (name, question, answer, answer_draft, sources_json, answer_status)
       VALUES (?, ?, '', '', '[]', 'pending')`
    ).bind(name, question).run();

    return Response.json({ ok: true, id: result.meta.last_row_id });
  } catch (e) {
    return Response.json({ error: "Không thể lưu câu hỏi. Vui lòng thử lại." }, { status: 500 });
  }
}
