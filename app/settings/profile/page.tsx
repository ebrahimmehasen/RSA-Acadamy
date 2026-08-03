import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export default async function ProfileSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 md:p-6" dir="rtl">
      <h1 className="text-2xl font-bold">الملف الشخصي</h1>
      <ProfileForm
        fullName={session.profile.full_name}
        phone={session.profile.phone}
        email={userData.user?.email ?? ""}
        pictureDriveId={session.profile.profile_picture_drive_id}
      />
    </div>
  );
}
