const json = (data, status = 200) => Response.json(data, { status });
const isAdmin = (request, env) =>
  Boolean(env.ADMIN_TOKEN) && request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`;

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Không có quyền quản trị." }, 401);
  const row = await env.DB.prepare("SELECT content, updated_at FROM lesson_content WHERE id = 1").first();
  return json({ content: row?.content || "", updated_at: row?.updated_at || null });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Không có quyền quản trị." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Dữ liệu không hợp lệ." }, 400); }
  const content = String(body.content || "").trim();
  if (content.length > 50000) return json({ error: "Nội dung tối đa 50.000 ký tự." }, 413);
  await env.DB.prepare(
    "INSERT INTO lesson_content (id, content, updated_at) VALUES (1, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at"
  ).bind(content).run();
  return json({ ok: true });
}
