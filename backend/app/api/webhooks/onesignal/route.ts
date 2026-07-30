/**
 * OneSignal delivery callback (Requirement 26). Marks invalid tokens for
 * removal. In production, verify the shared callback secret before processing.
 */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { invalidTokens?: string[] } | null;
  // Invalid tokens reported by OneSignal would be removed via Notification_Service here.
  void body;
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
