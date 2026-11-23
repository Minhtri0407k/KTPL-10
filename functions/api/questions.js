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
                answer_status, answered_directly, created_at
         FROM questions ORDER BY id DESC LIMIT 200`
      ).all();
      return Response.json({ questions: results || [] });
    }

    const { results } = await env.DB.prepare(
      `SELECT id, name, question,
              CASE WHEN answer_status = 'approved' THEN answer ELSE '' END AS answer,
              answer_status, answered_directly, created_at
       FROM questions ORDER BY id DESC LIMIT 200`
    ).all();
    return Response.json({ questions: results || [] });
  } catch (e) {
    return Response.json(
      { error: "Chưa kết nối được D1 hoặc chưa chạy migration_ai_review.sql." },
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
       (name, question, answer, answer_draft, sources_json, answer_status, answered_directly)
       VALUES (?, ?, '', '', '[]', 'pending', 0)`
    ).bind(name, question).run();

    return Response.json({ ok: true, id: result.meta.last_row_id });
  } catch (e) {
    return Response.json({ error: "Không thể lưu câu hỏi. Hãy kiểm tra D1 và migration." }, { status: 500 });
  }
}

export async function onRequestPut({ request, env }) {
  if (!authorized(request, env)) {
    return Response.json({ error: "Mã quản trị không đúng." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) {
      return Response.json({ error: "Mã câu hỏi không hợp lệ." }, { status: 400 });
    }
    await env.DB.prepare(
      "UPDATE questions SET answered_directly = ? WHERE id = ?"
    ).bind(body.answeredDirectly ? 1 : 0, id).run();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể cập nhật trạng thái câu hỏi." }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }) {
  if (!authorized(request, env)) {
    return Response.json({ error: "Mã quản trị không đúng." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids)
      ? body.ids.map(Number).filter(id => Number.isInteger(id) && id > 0).slice(0, 100)
      : [Number(body.id)].filter(id => Number.isInteger(id) && id > 0);
    if (!ids.length) {
      return Response.json({ error: "Chưa chọn câu hỏi hợp lệ để xóa." }, { status: 400 });
    }
    const placeholders = ids.map(() => "?").join(",");
    const result = await env.DB.prepare(
      `DELETE FROM questions WHERE id IN (${placeholders})`
    ).bind(...ids).run();
    return Response.json({ ok: true, deleted: result.meta.changes || 0 });
  } catch {
    return Response.json({ error: "Không thể xóa câu hỏi." }, { status: 500 });
  }
}
