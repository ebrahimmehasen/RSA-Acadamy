'use client';
import { useState } from 'react';
import { checkUploadStorage } from './actions';
const LABELS: Record<string, string> = { folder_cache_unavailable: 'تعذر قراءة إعداد الفولدر من قاعدة البيانات', folder_not_cached: 'الفولدر غير مسجل في الذاكرة الدائمة. لم يتم إنشاء أي فولدر', root_not_configured: 'الفولدر الرئيسي غير مضبوط', invalid_folder: 'الفولدر المسجل غير صالح أو محذوف', can_add_files: 'الحساب يستطيع إضافة ملفات للفولدر. هذا ليس اختبار رفع فعلي', cannot_add_files: 'الحساب لا يستطيع إضافة ملفات للفولدر', check_failed: 'فشل فحص اتصال درايف' };
const STAGES: Record<string, string> = { account: 'بيانات الحساب والمساحة', folder_cache: 'إعداد الفولدر المحفوظ', folder_metadata: 'الوصول لفولدر مرفقات الواجبات' };
export function StorageCheck() {
 const [result, setResult] = useState<Awaited<ReturnType<typeof checkUploadStorage>> | null>(null);
 const [busy, setBusy] = useState(false);
 const [failed, setFailed] = useState(false);
 return <div className="space-y-3"><p className="text-sm text-muted-foreground">فحص يدوي للقراءة فقط باستخدام اتصال النسخة الحالية. لا ينشئ ملفات ولا يغير إعدادات الاتصال.</p><button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" onClick={async () => { setBusy(true); setFailed(false); try { setResult(await checkUploadStorage()); } catch { setFailed(true); } finally { setBusy(false); } }}>{busy ? 'جارٍ الفحص...' : 'فحص اتصال درايف'}</button>{failed && <p role="alert">تعذر تنفيذ الفحص. تأكد من جلسة دخول الأدمن.</p>}{result && <div className="rounded-lg border p-4 space-y-2" role="status"><p>طريقة الاتصال: <span dir="ltr">{result.authMode}</span></p><p>الحساب المستخدم: <span dir="ltr">{result.account ?? 'غير متاح'}</span></p><p>{LABELS[result.state] ?? 'نتيجة غير معروفة'}</p>{'stage' in result && result.stage && <p>مرحلة الفحص: {STAGES[result.stage] ?? 'غير معروفة'}</p>}{'quotaFull' in result && result.quotaFull && <p>مساحة الحساب ممتلئة</p>}{'reason' in result && <p dir="ltr">{result.status ?? 'unknown'} / {result.reason}</p>}</div>}</div>;
}
