const json = (data, status = 200) => Response.json(data, { status });
const isAdmin = (request, env) =>
  Boolean(env.ADMIN_TOKEN) && request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`;

function parseLessons(raw) {
  const value = String(raw || "").trim();
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && typeof item === "object").map((item, index) => ({
        id: String(item.id || `lesson-${index + 1}`),
        title: String(item.title || `Bài học ${index + 1}`).slice(0, 160),
        content: String(item.content || "").slice(0, 50000)
      }));
    }
  } catch {}
  // Backward compatibility: preserve the existing single-lesson content.
  return [{ id: "bai-10", title: "Bài 10: Lập kế hoạch tài chính cá nhân", content: value }];
}

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Không có quyền quản trị." }, 401);
  if (!env.DB) return json({ error: "Database binding DB chưa được cấu hình." }, 500);
  const row = await env.DB.prepare("SELECT content, updated_at FROM lesson_content WHERE id = 1").first();
  return json({ lessons: parseLessons(row?.content), updated_at: row?.updated_at || null });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Không có quyền quản trị." }, 401);
  if (!env.DB) return json({ error: "Database binding DB chưa được cấu hình." }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Dữ liệu không hợp lệ." }, 400); }
  if (!Array.isArray(body.lessons)) return json({ error: "Danh sách bài học không hợp lệ." }, 400);
  if (body.lessons.length > 30) return json({ error: "Tối đa 30 bài học." }, 400);
  const lessons = body.lessons.map((item, index) => ({
    id: String(item?.id || `lesson-${index + 1}`).slice(0, 80),
    title: String(item?.title || "").trim().slice(0, 160),
    content: String(item?.content || "").trim()
  }));
  if (lessons.some(item => !item.title)) return json({ error: "Mỗi bài học cần có tiêu đề." }, 400);
  const total = lessons.reduce((sum, item) => sum + item.content.length, 0);
  if (total > 200000) return json({ error: "Tổng nội dung thư viện tối đa 200.000 ký tự." }, 413);
  await env.DB.prepare(
    "INSERT INTO lesson_content (id, content, updated_at) VALUES (1, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at"
  ).bind(JSON.stringify(lessons)).run();
  return json({ ok: true, lessons });
}
