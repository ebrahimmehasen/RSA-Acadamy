export type UploadStage = 'initialization' | 'folder' | 'resumable' | 'chunk' | 'status';
const REASONS = new Set(['storageQuotaExceeded', 'insufficientFilePermissions', 'notFound', 'invalid_grant', 'invalid_client', 'authError', 'rateLimitExceeded', 'userRateLimitExceeded', 'dailyLimitExceeded', 'forbidden', 'backendError']);
export function safeUploadError(error: unknown): { status: number | null; reason: string } {
  const e = error as { status?: unknown; code?: unknown; response?: { status?: unknown; data?: { error?: { status?: unknown; errors?: { reason?: unknown }[] } | string } }; diagnosticReason?: unknown } | null;
  const status = Number(e?.response?.status ?? e?.status ?? e?.code);
  const provider = e?.response?.data?.error;
  const reason = e?.diagnosticReason ?? (typeof provider === 'string' ? provider : provider?.errors?.[0]?.reason);
  return { status: Number.isInteger(status) && status >= 400 && status <= 599 ? status : null,
    reason: typeof reason === 'string' && REASONS.has(reason) ? reason : 'unknown' };
}
