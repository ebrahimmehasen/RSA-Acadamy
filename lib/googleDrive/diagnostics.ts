import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { drive, ROOT_FOLDER_ID } from './client';
import { safeUploadError } from '@/lib/uploadDiagnosticsSafe';

/** Read-only calls only, invoked by the separately admin-gated server action. */
export async function runStorageCheck() {
 const authMode = process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REFRESH_TOKEN ? 'OAuth' : 'Service account';
 let account: string | null = null;
 let quotaFull = false;
 let stage: 'account' | 'folder_cache' | 'folder_metadata' = 'account';
 try {
  const { data: about } = await drive.about.get({ fields: 'user(emailAddress),storageQuota(limit,usage)' }, { timeout: 8000 });
  account = about.user?.emailAddress ?? null;
  quotaFull = !!about.storageQuota?.limit && Number(about.storageQuota.usage) >= Number(about.storageQuota.limit);
  stage = 'folder_cache';
  const { data: cached, error } = await createAdminClient().from('drive_folders').select('drive_id').eq('path', 'Assignment_Files/Teacher_Attachments').maybeSingle();
  if (error) return { authMode, account: about.user?.emailAddress ?? null, state: 'folder_cache_unavailable' };
  if (!cached?.drive_id) return { authMode, account: about.user?.emailAddress ?? null, state: ROOT_FOLDER_ID ? 'folder_not_cached' : 'root_not_configured' };
  stage = 'folder_metadata';
  const { data: folder } = await drive.files.get({ fileId: cached.drive_id, fields: 'mimeType,trashed,capabilities(canAddChildren)' }, { timeout: 8000 });
  return { authMode, account: about.user?.emailAddress ?? null, state: folder.trashed || folder.mimeType !== 'application/vnd.google-apps.folder' ? 'invalid_folder' : folder.capabilities?.canAddChildren ? 'can_add_files' : 'cannot_add_files', quotaFull: !!about.storageQuota?.limit && Number(about.storageQuota.usage) >= Number(about.storageQuota.limit) };
 } catch (error) { return { authMode, account, quotaFull, stage, state: 'check_failed', ...safeUploadError(error) }; }
}
