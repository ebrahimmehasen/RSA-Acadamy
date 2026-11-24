import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeUploadError, type UploadStage } from './uploadDiagnosticsSafe';

export const DIAGNOSTIC_EVENT = 'upload_diagnostic_v1';
let lastWrite = 0;

/** Only fixed categories cross this boundary. Never persist an exception object. */
export async function recordUploadError(error: unknown, stage: UploadStage): Promise<string> {
  const id = randomUUID();
  const now = Date.now();
  if (now - lastWrite < 10000) return id;
  lastWrite = now;
  try {
    const db = createAdminClient();
    await db.from('security_logs').insert({
      profile_id: null, event_type: DIAGNOSTIC_EVENT,
      metadata: { reference: id, stage, ...safeUploadError(error) },
    }).abortSignal(AbortSignal.timeout(1500));
    // Delete diagnostics only. Existing security/audit records are never touched.
    await db.from('security_logs').delete().eq('event_type', DIAGNOSTIC_EVENT)
      .lt('created_at', new Date(now - 7 * 86400000).toISOString()).abortSignal(AbortSignal.timeout(1500));
    const { data } = await db.from('security_logs').select('id')
      .eq('event_type', DIAGNOSTIC_EVENT).order('id', { ascending: false }).range(199, 199).abortSignal(AbortSignal.timeout(1500));
    if (data?.[0]) await db.from('security_logs').delete()
      .eq('event_type', DIAGNOSTIC_EVENT).lt('id', data[0].id).abortSignal(AbortSignal.timeout(1500));
  } catch { /* diagnostics must not break the original operation */ }
  return id;
}

export async function readUploadErrors() {
  return createAdminClient().from('security_logs').select('id,metadata,created_at')
    .eq('event_type', DIAGNOSTIC_EVENT)
    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
    .order('id', { ascending: false }).limit(200);
}
