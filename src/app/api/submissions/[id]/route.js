import { supabaseAdmin } from '@/lib/supabaseServer';
import { requireWebhookSecret } from '@/lib/verify';

export async function GET(req, { params }) {
  const unauthorized = requireWebhookSecret(req);
  if (unauthorized) return unauthorized;

  const id = params?.id;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return new Response('Invalid id', { status: 400 });

  // fetch submission
  const { data: submission, error } = await supabaseAdmin
    .from('submissions')
    .select('id,user_id,language,role_target,job_ad_text,job_ad_url,cv_path')
    .eq('id', id)
    .single();

  if (error || !submission) return new Response('Not found', { status: 404 });

  // fetch user email (optional)
  const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(submission.user_id);

  // sign CV (10 min)
  const { data: signed, error: signErr } = await supabaseAdmin
    .storage.from('submissions')
    .createSignedUrl(submission.cv_path, 600);

  if (signErr) return new Response('Failed to sign CV', { status: 500 });

  return Response.json({
    user: { id: submission.user_id, email: userRes?.user?.email ?? null },
    language: submission.language,
    roleTarget: submission.role_target,
    jobAdText: submission.job_ad_text,
    jobAdUrl: submission.job_ad_url,
    cvSignedUrl: signed.signedUrl
  });
}
