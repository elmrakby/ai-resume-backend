export function requireWebhookSecret(req) {
  const value = req.headers.get('x-webhook-secret');
  if (!value || value !== process.env.WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  return null;
}
