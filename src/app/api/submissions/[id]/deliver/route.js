import { supabaseAdmin } from '@/lib/supabaseServer';
import { requireWebhookSecret } from '@/lib/verify';

function base64ToUint8Array(b64) {
  const buf = Buffer.from(b64, 'base64');
  return new Uint8Array(buf);
}

export async function POST(req, { params }) {
  const unauthorized = requireWebhookSecret(req);
  if (unauthorized) return unauthorized;

  const id = params?.id;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return new Response('Invalid id', { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { files, notes } = body || {};
  if (!Array.isArray(files) || files.length === 0) {
    return new Response('files[] required', { status: 400 });
  }

  // find submission (for user_id)
  const { data: submission, error } = await supabaseAdmin
    .from('submissions')
    .select('id,user_id')
    .eq('id', id)
    .single();

  if (error || !submission) return new Response('Submission not found', { status: 404 });

  // upload each file to deliverables bucket: userId/submissionId/filename
  const uploaded = [];
  for (const f of files) {
    if (!f?.name || !f?.contentBase64) {
      return new Response('Invalid file object', { status: 400 });
    }
    const path = `${submission.user_id}/${submission.id}/${f.name}`;
    const bytes = base64ToUint8Array(f.contentBase64);

    const { error: upErr } = await supabaseAdmin
      .storage.from('deliverables')
      .upload(path, bytes, { upsert: true });

    if (upErr) return new Response(`Upload failed: ${f.name}`, { status: 500 });
    uploaded.push({ name: f.name, file_path: path });
  }

  // insert deliverable rows
  const { error: insErr } = await supabaseAdmin.from('deliverables').insert(
    uploaded.map(u => ({
      submission_id: submission.id,
      name: u.name,
      file_path: u.file_path,
      notes: notes ?? null
    }))
  );
  if (insErr) return new Response('DB insert failed', { status: 500 });

  // mark submission delivered
  await supabaseAdmin.from('submissions').update({ status: 'DELIVERED' }).eq('id', submission.id);

  return Response.json({ ok: true, count: uploaded.length });
}
