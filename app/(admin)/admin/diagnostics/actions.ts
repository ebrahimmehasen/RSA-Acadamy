'use server';
import { requireRole } from '@/lib/auth/guards';
import { runStorageCheck } from '@/lib/googleDrive/diagnostics';

export async function checkUploadStorage() {
  await requireRole('admin');
  return runStorageCheck();
}
