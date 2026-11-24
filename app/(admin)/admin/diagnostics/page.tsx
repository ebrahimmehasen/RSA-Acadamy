import { requireRole } from '@/lib/auth/guards';
import { readUploadErrors } from '@/lib/uploadDiagnostics';
import { safeUploadError } from '@/lib/uploadDiagnosticsSafe';
import { PageShell } from '@/components/shared/PageShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { StorageCheck } from './StorageCheck';

export const dynamic = 'force-dynamic';
export default async function DiagnosticsPage() {
 await requireRole('admin');
 const { data, error } = await readUploadErrors();
 return <PageShell><PageHeader title="الأخطاء والمشاكل" description="تشخيص رفع مرفقات الواجبات. لا توجد متابعة تلقائية أو بيانات طلاب أو مفاتيح سرية." /><SectionCard title="اتصال التخزين"><StorageCheck /></SectionCard><SectionCard title="أخطاء الرفع الأخيرة" description="آخر 200 حدث خلال 7 أيام. يسجل خطأ واحدًا بحد أقصى كل 10 ثوانٍ لكل نسخة تشغيل. السجل يبدأ بعد نشر هذه الصفحة، ولا يستعيد الأخطاء القديمة.">{error ? <p role="alert">تعذر قراءة سجل المشاكل. لا يعني هذا عدم وجود أخطاء.</p> : !data?.length ? <p className="text-muted-foreground">لا توجد أخطاء مسجلة في الفترة المحددة.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['الوقت','المرحلة','الحالة','السبب','مرجع المتابعة'].map(x=><th key={x} className="p-3 text-start">{x}</th>)}</tr></thead><tbody>{data.map(row=> { const m = row.metadata ?? {}; const safe = safeUploadError({ status: m.status, diagnosticReason: m.reason }); const stage = ['initialization','folder','resumable','chunk','status'].includes(m.stage) ? m.stage : 'unknown'; const ref = typeof m.reference === 'string' && /^[a-f0-9-]{36}$/.test(m.reference) ? m.reference : 'unknown'; return <tr key={row.id} className="border-t"><td className="p-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString('ar-EG')}</td><td className="p-3" dir="ltr">{stage}</td><td className="p-3">{safe.status ?? '-'}</td><td className="p-3" dir="ltr">{safe.reason}</td><td className="p-3 font-mono text-xs" dir="ltr">{ref}</td></tr>; })}</tbody></table></div>}</SectionCard></PageShell>;
}
