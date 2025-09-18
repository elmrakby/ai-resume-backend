export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const { jobAdText, jobAdUrl, cvText, language } = body || {};

  // TODO: replace with real LangChain/LLM logic
  const result = {
    role: "Software Engineer",
    seniority: "Mid",
    skills: ["React", "TypeScript", "Node.js"],
    keywords: ["frontend", "SPA", "REST"],
    summary: "Strong frontend focus with React/TS; experience building SPAs."
  };

  return Response.json({ ok: true, extracted: result });
}
