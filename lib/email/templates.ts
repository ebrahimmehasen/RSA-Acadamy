function wrapper(title: string, body: string): string {
  return `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#3f7dd1;">${title}</h2>
      ${body}
      <p style="color:#6b7280; font-size:12px; margin-top:24px;">RSA Academy</p>
    </div>
  `;
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
