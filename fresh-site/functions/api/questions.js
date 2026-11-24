const json = (data, status = 200) => Response.json(data, { status });
const isAdmin = (request, env) => {
  const token = request.headers.get("Authorization") || "";
  return Boolean(env.ADMIN_TOKEN) && token === `Bearer ${env.ADMIN_TOKEN}`;
};

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Database binding DB chưa được cấu hình." }, 500);
  const admin = new URL(request.url).searchParams.get("admin") === "1";
  if (admin && !isAdmin(request, env)) return json({ error: "Không có quyền quản trị." }, 401);

  const sql = admin
    ? "SELECT id, name, class_name, question, answer, answer_draft, sources_json, answer_status, answered_directly, created_at FROM (SELECT id, name, class_name, question, answer, answer_draft, sources_json, answer_status, answered_directly, created_at FROM questions ORDER BY id DESC LIMIT 300) ORDER BY id ASC"
    : "SELECT id, name, class_name, question, CASE WHEN answer_status = 'approved' THEN answer ELSE '' END AS answer, answer_status, answered_directly, created_at FROM (SELECT id, name, class_name, question, CASE WHEN answer_status = 'approved' THEN answer ELSE '' END AS answer, answer_status, answered_directly, created_at FROM questions ORDER BY id DESC LIMIT 200) ORDER BY id ASC";
  const result = await env.DB.prepare(sql).all();
  return json({ questions: result.results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Database binding DB chưa được cấu hình." }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Dữ liệu gửi lên không hợp lệ." }, 400); }

  const name = String(body.name || "").trim().slice(0, 80);
  const className = String(body.class_name || "").trim().slice(0, 30);
  const question = String(body.question || "").trim().slice(0, 2000);
  if (!name || !question) return json({ error: "Vui lòng nhập tên và câu hỏi." }, 400);
  if (question.length < 5) return json({ error: "Câu hỏi cần có ít nhất 5 ký tự." }, 400);

  // Prevent accidental repeated submissions without collecting or storing IP addresses.
  const duplicate = await env.DB.prepare(
    "SELECT id FROM questions WHERE lower(trim(question)) = lower(trim(?)) AND created_at >= datetime('now', '-90 seconds') LIMIT 1"
  ).bind(question).first();
  if (duplicate) return json({ error: "Câu hỏi này vừa được gửi. Hãy chờ một chút trước khi gửi lại." }, 429);

  const result = await env.DB.prepare(
    "INSERT INTO questions (name, class_name, question) VALUES (?, ?, ?)"
  ).bind(name, className, question).run();
  return json({ ok: true, id: result.meta.last_row_id }, 201);
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Mã quản trị không đúng." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Dữ liệu không hợp lệ." }, 400); }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) return json({ error: "ID câu hỏi không hợp lệ." }, 400);
  const answered = body.answered_directly ? 1 : 0;
  if (Object.prototype.hasOwnProperty.call(body, "answer")) {
    const answer = String(body.answer || "").trim();
    if (answered && answer.length < 5) return json({ error: "Hãy nhập nội dung câu trả lời trực tiếp (ít nhất 5 ký tự)." }, 400);
    if (answer.length > 12000) return json({ error: "Câu trả lời vượt quá giới hạn." }, 413);
    if (answered) {
      await env.DB.prepare("UPDATE questions SET answered_directly = 1, answer = ?, answer_draft = ?, answer_status = 'approved' WHERE id = ?").bind(answer, answer, id).run();
    } else {
      await env.DB.prepare("UPDATE questions SET answered_directly = 0 WHERE id = ?").bind(id).run();
    }
  } else {
    await env.DB.prepare("UPDATE questions SET answered_directly = ? WHERE id = ?").bind(answered, id).run();
  }
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Mã quản trị không đúng." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Dữ liệu không hợp lệ." }, 400); }
  const ids = Array.isArray(body.ids) ? body.ids : [body.id];
  const valid = [...new Set(ids.map(Number).filter(n => Number.isInteger(n) && n > 0))].slice(0, 100);
  if (!valid.length) return json({ error: "Chưa chọn câu hỏi hợp lệ." }, 400);
  const placeholders = valid.map(() => "?").join(",");
  await env.DB.prepare(`DELETE FROM questions WHERE id IN (${placeholders})`).bind(...valid).run();
  return json({ ok: true, deleted: valid.length });
}
