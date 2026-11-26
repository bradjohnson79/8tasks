import { AppHeader } from "@/components/app/app-header";
import { DemoBanner } from "@/components/app/demo-banner";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { SiteFooter } from "@/components/app/site-footer";
import { SavedSync } from "@/components/account/saved-sync";
import { getUser } from "@/lib/account";

/** Responsive application shell: one layout for every screen size (design spec §7). */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser().catch(() => null);
  return (
    <>
      <SavedSync signedIn={!!user} />
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <DemoBanner />
      <AppHeader />
      <div className="pb-bottom-nav flex flex-1 flex-col lg:pb-0">
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
      <MobileBottomNav />
    </>
  );
}
