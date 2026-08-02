function wrapper(title: string, body: string): string {
  return `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#3f7dd1;">${title}</h2>
      ${body}
      <p style="color:#6b7280; font-size:12px; margin-top:24px;">RSA Academy</p>
    </div>
  `;
}

export function paymentDecisionEmail(options: {
  approved: boolean;
  studentName: string;
  amount: number;
  notes?: string | null;
}): string {
  return wrapper(
    options.approved ? "تم قبول إثبات الدفع ✅" : "تم رفض إثبات الدفع",
    `<p>بخصوص رسوم <b>${options.studentName}</b> (${options.amount} جنيه):</p>
     ${
       options.approved
         ? "<p>راجعت الإدارة إثبات الدفع ووافقت عليه. شكرًا لتعاملك معنا.</p>"
         : `<p>راجعت الإدارة إثبات الدفع ولم توافق عليه.${
             options.notes ? ` السبب: ${options.notes}` : ""
           } من فضلك أعد رفع إثبات صحيح.</p>`
     }`,
  );
}

export function assignmentGradedEmail(options: {
  studentName: string;
  title: string;
  grade: number;
  maxGrade: number;
}): string {
  return wrapper(
    "تم تصحيح واجبك",
    `<p>مرحبًا ${options.studentName}،</p>
     <p>تم تصحيح واجب <b>${options.title}</b> وحصلت على
        <b>${options.grade}/${options.maxGrade}</b>.</p>`,
  );
}

export function salaryPaidEmail(options: {
  teacherName: string;
  month: string;
  amount: number;
  currency: string;
}): string {
  return wrapper(
    "تم صرف راتبك",
    `<p>مرحبًا أ/ ${options.teacherName}،</p>
     <p>تم تحويل راتب شهر ${options.month}
        (<b>${options.amount} ${options.currency}</b>).</p>`,
  );
}
