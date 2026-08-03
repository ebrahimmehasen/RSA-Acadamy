import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(`/${session.profile.role}/dashboard`);
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-8"
      dir="rtl"
    >
      <h1 className="text-4xl font-bold">RSA Academy</h1>
      <p className="text-muted-foreground">المنصة التعليمية لأكاديمية RSA</p>
      <div className="flex gap-3">
        <Button render={<Link href="/login">تسجيل الدخول</Link>} />
        <Button
          variant="outline"
          render={<Link href="/signup">إنشاء حساب جديد</Link>}
        />
      </div>
    </main>
  );
}
