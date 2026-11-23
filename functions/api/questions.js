
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

const ADMIN_PASSWORD = "KTPL10@2026";

function isAdmin(request) {
  const auth = request.headers.get("Authorization") || "";
  return auth === `Bearer ${ADMIN_PASSWORD}`;
}
// Lấy danh sách câu hỏi
export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT id, class_name, name, question, created_at
      FROM questions
      ORDER BY id DESC
      LIMIT 300
    `).all();

    return json({ questions: results || [] });
  } catch (error) {
    console.error("GET QUESTIONS:", error);
    return json({ error: "Không tải được danh sách câu hỏi." }, 500);
  }
}

// Gửi câu hỏi mới
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const className = String(body.className || "").trim().slice(0, 30);
    const name = String(body.name || "").trim().slice(0, 50);
    const question = String(body.question || "").trim().slice(0, 1500);

    if (!className || !name || !question) {
      return json({ error: "Vui lòng nhập đầy đủ tên lớp, tên và câu hỏi." }, 400);
    }

    if (question.length < 5) {
      return json({ error: "Câu hỏi cần ít nhất 5 ký tự." }, 400);
    }

    const result = await env.DB.prepare(`
      INSERT INTO questions (class_name, name, question, answer)
      VALUES (?, ?, ?, '')
    `).bind(className, name, question).run();

    return json({
      ok: true,
      id: result.meta.last_row_id
    });
  } catch (error) {
    console.error("POST QUESTION:", error);
    return json({ error: "Không thể gửi câu hỏi. Hãy thử lại." }, 500);
  }
}

// Xóa một hoặc nhiều câu hỏi - chỉ quản trị viên
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
      return json({ error: "Danh sách câu hỏi cần xóa không hợp lệ." }, 400);
    }

    const placeholders = ids.map(() => "?").join(",");

    await env.DB.prepare(
      `DELETE FROM questions WHERE id IN (${placeholders})`
    ).bind(...ids).run();

    return json({ ok: true, deleted: ids.length });
  } catch (error) {
    console.error("DELETE QUESTIONS:", error);
    return json({ error: "Không thể xóa câu hỏi." }, 500);
  }
}
