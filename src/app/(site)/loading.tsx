import { Container } from "@/components/app/container";
import { MissionGridSkeleton } from "@/components/app/loading-skeleton";

export default function Loading() {
  return (
    <Container className="flex flex-col gap-5 pt-8">
      <div className="h-8 w-56 animate-pulse rounded bg-surface" />
      <div className="h-12 animate-pulse rounded-xl bg-surface" />
      <MissionGridSkeleton />
    </Container>
  );
}
