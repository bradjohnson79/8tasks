import { redirect } from "next/navigation";

/** Free alerts are part of My Daily 8 email preferences. */
export default function AlertsPage() {
  redirect("/daily-8#signup");
}
