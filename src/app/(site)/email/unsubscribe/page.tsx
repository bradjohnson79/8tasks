import type { Metadata } from "next";
import { Container } from "@/components/app/container";
import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <Container className="flex max-w-xl flex-col gap-4 pt-8 pb-10">
      <h1 className="text-2xl font-bold">Unsubscribe</h1>
      {token ? (
        <UnsubscribeForm token={token} />
      ) : (
        <p className="text-text-2">Use the unsubscribe link from any 8Tasks email.</p>
      )}
    </Container>
  );
}
