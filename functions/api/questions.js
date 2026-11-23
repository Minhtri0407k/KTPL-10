const ADMIN_PASSWORD = "KTPL10@2026";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function isAdmin(request) {
  return request.headers.get("Authorization") ===
    `Bearer ${ADMIN_PASSWORD}`;
}

// LẤY DANH SÁCH CÂU HỎI
export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT id, class_name, name, question, answer,
             answered_directly, created_at
      FROM questions
      ORDER BY id DESC
      LIMIT 300
    `).all();

    return json({ questions: results || [] });
  } catch (error) {
    console.error("GET ERROR:", error);
    return json({ error: "Không tải được câu hỏi." }, 500);
  }
}

// HỌC SINH GỬI CÂU HỎI
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const className = String(body.className || "").trim().slice(0, 30);
    const name = String(body.name || "").trim().slice(0, 50);
    const question = String(body.question || "").trim().slice(0, 1500);

    if (!className || !name || !question) {
      return json({ error: "Vui lòng nhập đầy đủ thông tin." }, 400);
    }

    if (question.length < 5) {
      return json({ error: "Câu hỏi quá ngắn." }, 400);
    }

    const result = await env.DB.prepare(`
      INSERT INTO questions
      (class_name, name, question, answer, answered_directly)
      VALUES (?, ?, ?, '', 0)
    `).bind(className, name, question).run();

    return json({
      ok: true,
      id: result.meta.last_row_id
    });
  } catch (error) {
    console.error("POST ERROR:", error);
    return json({ error: "Không gửi được câu hỏi." }, 500);
  }
}

// CẬP NHẬT CÂU TRẢ LỜI VÀ TRẠNG THÁI
export async function onRequestPut({ request, env }) {
  if (!isAdmin(request)) {
    return json({ error: "Không có quyền quản trị." }, 401);
  }

  try {
    const body = await request.json();

    const id = Number(body.id);
    const answer = String(body.answer ?? "").trim().slice(0, 5000);
    const answeredDirectly = body.answeredDirectly ? 1 : 0;

    if (!Number.isInteger(id) || id <= 0) {
      return json({ error: "ID câu hỏi không hợp lệ." }, 400);
    }

    await env.DB.prepare(`
      UPDATE questions
      SET answer = ?, answered_directly = ?
      WHERE id = ?
    `).bind(answer, answeredDirectly, id).run();

    return json({ ok: true });
  } catch (error) {
    console.error("PUT ERROR:", error);
    return json({ error: "Không lưu được câu trả lời." }, 500);
  }
}

// XÓA MỘT HOẶC NHIỀU CÂU HỎI
export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request)) {
    return json({ error: "Không có quyền quản trị." }, 401);
  }

  try {
    const body = await request.json();

    const ids = [...new Set(
      (Array.isArray(body.ids) ? body.ids : [body.id])
        .map(Number)
        .filter(id => Number.isInteger(id) && id > 0)
    )];

    if (!ids.length || ids.length > 300) {
      return json({ error: "Danh sách ID không hợp lệ." }, 400);
    }

    const placeholders = ids.map(() => "?").join(",");

    await env.DB.prepare(
      `DELETE FROM questions WHERE id IN (${placeholders})`
    ).bind(...ids).run();

    return json({ ok: true, deleted: ids.length });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return json({ error: "Không xóa được câu hỏi." }, 500);
  }
}
