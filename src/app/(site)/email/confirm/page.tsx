import type { Metadata } from "next";
import { Container } from "@/components/app/container";
import { ConfirmForm } from "./confirm-form";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <Container className="flex max-w-xl flex-col gap-4 pt-8 pb-10">
      <h1 className="text-2xl font-bold">Confirm My Daily 8</h1>
      {token ? (
        <ConfirmForm token={token} />
      ) : (
        <p className="text-text-2">Use the link from your email.</p>
      )}
    </Container>
  );
}
