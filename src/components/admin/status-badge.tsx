import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: "draft" | "published" | "archived" }) {
  if (status === "published") return <Badge>Published</Badge>;
  if (status === "archived") return <Badge variant="outline">Archived</Badge>;
  return <Badge variant="secondary">Draft</Badge>;
}
