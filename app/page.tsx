import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPlatformSettings } from "@/lib/settings";
import { LandingPage } from "@/components/marketing/LandingPage";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(`/${session.profile.role}/dashboard`);
  }

  const { authEnabled } = await getPlatformSettings();
  return <LandingPage authEnabled={authEnabled} />;
}
