import Link from "next/link";
import {
  ArrowRightIcon,
  CompassIcon,
  HandCoinsIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from "lucide-react";
import { AffiliateNotice } from "@/components/site/affiliate-notice";
import { CategoryCard } from "@/components/site/category-card";
import { HeroIllustration } from "@/components/site/hero-illustration";
import { Button } from "@/components/ui/button";
import { getActiveCategories } from "@/db/queries/public";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: CompassIcon,
    title: "Browse missions",
    body: "Explore surveys, testing, research and more, sorted into clear categories.",
  },
  {
    icon: UserPlusIcon,
    title: "Join the provider",
    body: "We send you to the provider's own site. You sign up and complete tasks with them.",
  },
  {
    icon: HandCoinsIcon,
    title: "Get paid by the provider",
    body: "Providers verify your work and pay you directly under their own terms.",
  },
];

export default async function HomePage() {
  const categories = await getActiveCategories();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] size-[520px] rounded-full bg-mint/15 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-[1fr_auto] lg:py-16">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              <ShieldCheckIcon className="size-3.5 text-mint" aria-hidden />
              Independent directory of earning opportunities
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Find your next <span className="text-mint">mission</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75 text-pretty">
              Discover surveys, app and website testing, paid research, mystery shopping and more
              from established third-party providers, all in one place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-mint text-navy hover:bg-mint/90">
                <Link href="#categories">
                  Browse categories <ArrowRightIcon />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="#how-it-works">How it works</Link>
              </Button>
            </div>
          </div>
          <div className="hidden lg:block">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section
        id="categories"
        className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mission categories</h2>
          <p className="text-muted-foreground">
            Pick a type of task that fits your time and skills.
          </p>
        </div>
        {categories.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c.id}>
                <CategoryCard {...c} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            Categories are being set up. Check back soon.
          </p>
        )}
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-10 flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How 8Tasks works</h2>
            <p className="max-w-2xl text-muted-foreground">
              8Tasks is a discovery site. We don&apos;t employ taskers, hold your money or check
              your work. Providers do all of that directly.
            </p>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-2xl bg-background p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold">
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <AffiliateNotice className="mt-10" />
        </div>
      </section>
    </>
  );
}
