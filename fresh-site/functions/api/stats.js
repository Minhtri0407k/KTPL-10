const json = (data, status = 200) => Response.json(data, { status });
const isAdmin = (request, env) =>
  Boolean(env.ADMIN_TOKEN) && request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`;

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Không có quyền quản trị." }, 401);
  if (!env.DB) return json({ error: "Database binding DB chưa được cấu hình." }, 500);
  const row = await env.DB.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN answer_status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN answer_status = 'draft' THEN 1 ELSE 0 END) AS drafts,
      SUM(CASE WHEN answer_status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN answered_directly = 1 THEN 1 ELSE 0 END) AS answered_directly,
      SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) AS today
    FROM questions
  `).first();
  return json({
    total: Number(row?.total || 0),
    approved: Number(row?.approved || 0),
    drafts: Number(row?.drafts || 0),
    pending: Number(row?.pending || 0),
    answered_directly: Number(row?.answered_directly || 0),
    today: Number(row?.today || 0)
  });
}
