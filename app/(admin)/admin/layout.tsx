import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";
import { fileUrl } from "@/lib/signedFileUrl";
import { ROLE_NAV } from "@/lib/roleNav";
import { checkFilesWorker } from "@/lib/filesWorkerHealth";
import { FilesWorkerAlert } from "@/components/shared/FilesWorkerAlert";

// Every page here is per-user and session-gated — never prerender.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/");

  const { title, nav, density } = ROLE_NAV.admin;
  const workerHealth = await checkFilesWorker();

  return (
    <RoleShell
      title={title}
      fullName={session.profile.full_name}
      profileId={session.profile.id}
      pictureUrl={
        session.profile.profile_picture_drive_id
          ? fileUrl(session.profile.profile_picture_drive_id)
          : null
      }
      nav={nav}
      density={density}
      banner={<FilesWorkerAlert issue={workerHealth.issue} probeUrl={workerHealth.probeUrl} />}
    >
      {children}
    </RoleShell>
  );
}
