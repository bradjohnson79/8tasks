import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ProgramForm } from "@/components/admin/program-form";
import { affiliatePrograms } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";
import { saveProgram } from "../../../../earnings-actions";

export const metadata = { title: "Edit affiliate program" };

export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requireAdminPage();
  const { id } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(id)) notFound();
  const [program] = await db.select().from(affiliatePrograms).where(eq(affiliatePrograms.id, id));
  if (!program) notFound();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/earnings/programs"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Programs
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{program.name}</h1>
        <p className="text-xs text-muted-foreground">{program.id}</p>
      </div>
      <ProgramForm action={saveProgram.bind(null, program.id)} program={program} />
    </div>
  );
}
