import { Container } from "./container";

/** Simple text page shell (About, Contact, Press). */
export function StaticPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children?: React.ReactNode;
}) {
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 pb-10 sm:pt-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">{title}</h1>
        {intro && <p className="mt-2 text-[15px] text-text-2">{intro}</p>}
      </div>
      <div className="flex flex-col gap-4 text-[15px] text-text-2 [&_a]:text-emerald [&_a:hover]:underline [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground">
        {children}
      </div>
    </Container>
  );
}
