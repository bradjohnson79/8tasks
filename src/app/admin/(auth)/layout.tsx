import { Logo } from "@/components/site/logo";

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="rounded-xl bg-navy px-3 py-2 text-white">
        <Logo />
      </div>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
    </div>
  );
}
