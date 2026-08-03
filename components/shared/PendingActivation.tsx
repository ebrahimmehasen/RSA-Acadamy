"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const TABLE_BY_ROLE = {
  student: "students",
  teacher: "teachers",
  parent: "parents",
} as const;

export function PendingActivation({
  profileId,
  role,
  fullName,
}: {
  profileId: number;
  role: keyof typeof TABLE_BY_ROLE;
  fullName: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const table = TABLE_BY_ROLE[role];
    const channel = supabase
      .channel(`activation:${table}:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table,
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          if ((payload.new as { is_active?: boolean }).is_active) {
            router.refresh();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, role, router]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
      dir="rtl"
    >
      <div className="text-5xl">⏳</div>
      <h1 className="text-2xl font-bold">أهلاً {fullName}</h1>
      <p className="max-w-sm text-muted-foreground">
        حسابك اتعمل بنجاح، بس لسه محتاج تفعيل من إدارة RSA Academy. الصفحة
        هتشتغل عندك تلقائيًا فور ما يتفعّل حسابك — مش محتاج تعمل حاجة.
      </p>
      <Button variant="outline" size="sm" onClick={signOut}>
        تسجيل الخروج
      </Button>
    </div>
  );
}
