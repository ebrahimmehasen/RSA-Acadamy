import { getPlatformSettings } from "@/lib/settings";
import { LandingPage } from "@/components/marketing/LandingPage";

// Static + ISR: rendered once, not per visit (was ~53ms CPU per hit when
// dynamic). Signed-in visitors are redirected to their dashboard by
// proxy.ts; the admin's platform toggle calls revalidatePath("/").
export const revalidate = 3600;

export default async function Home() {
  const { authEnabled } = await getPlatformSettings();
  return <LandingPage authEnabled={authEnabled} />;
}
