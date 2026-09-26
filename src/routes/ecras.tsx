import { createFileRoute } from "@tanstack/react-router";
import { MonitorPlay } from "lucide-react";
import { AppShell, EmptyState } from "@/components/AppShell";

export const Route = createFileRoute("/ecras")({
  head: () => ({
    meta: [
      { title: "Ecrãs — VRCF Montra" },
      { name: "description", content: "Gestão dos ecrãs da sua organização." },
      { property: "og:title", content: "Ecrãs — VRCF Montra" },
      { property: "og:description", content: "Gestão dos ecrãs da sua organização." },
    ],
  }),
  component: () => (
    <AppShell title="Ecrãs">
      <EmptyState
        icon={MonitorPlay}
        title="Disponível na fase seguinte"
        description="O emparelhamento e a gestão de ecrãs chegam na próxima fase."
      />
    </AppShell>
  ),
});
