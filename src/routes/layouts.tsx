import { createFileRoute } from "@tanstack/react-router";
import { LayoutTemplate } from "lucide-react";
import { AppShell, EmptyState } from "@/components/AppShell";

export const Route = createFileRoute("/layouts")({
  head: () => ({
    meta: [
      { title: "Layouts — VRCF Montra" },
      { name: "description", content: "Divisão do ecrã em zonas." },
      { property: "og:title", content: "Layouts — VRCF Montra" },
      { property: "og:description", content: "Divisão do ecrã em zonas." },
    ],
  }),
  component: () => (
    <AppShell title="Layouts">
      <EmptyState
        icon={LayoutTemplate}
        title="Disponível na fase seguinte"
        description="O editor de zonas do ecrã chega na próxima fase."
      />
    </AppShell>
  ),
});
