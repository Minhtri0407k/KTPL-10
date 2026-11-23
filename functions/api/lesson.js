
function authorized(request, env) {
  const token = request.headers.get("Authorization") || "";
  return Boolean(env.ADMIN_TOKEN) && token === `Bearer ${env.ADMIN_TOKEN}`;
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) {
    return Response.json({ error: "Mã quản trị không đúng." }, { status: 401 });
  }
  try {
    const row = await env.DB.prepare(
      "SELECT content FROM lesson_content WHERE id = 1"
    ).first();
    return Response.json({ content: row?.content || "" });
  } catch {
    return Response.json({ error: "Chưa cấu hình cơ sở dữ liệu D1." }, { status: 503 });
  }
}

export async function onRequestPut({ request, env }) {
  if (!authorized(request, env)) {
    return Response.json({ error: "Mã quản trị không đúng." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const content = String(body.content || "").trim();
    if (content.length > 30000) {
      return Response.json({ error: "Tài liệu quá dài (tối đa 30.000 ký tự)." }, { status: 400 });
    }
    await env.DB.prepare(
      "INSERT INTO lesson_content (id, content) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET content = excluded.content"
    ).bind(content).run();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể lưu tài liệu." }, { status: 500 });
  }
}
