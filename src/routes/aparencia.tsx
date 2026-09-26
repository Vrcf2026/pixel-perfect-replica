import { createFileRoute } from "@tanstack/react-router";
import { Palette } from "lucide-react";
import { AppShell, EmptyState } from "@/components/AppShell";

export const Route = createFileRoute("/aparencia")({
  head: () => ({
    meta: [
      { title: "Aparência — VRCF Montra" },
      { name: "description", content: "Cores e estilo dos seus ecrãs." },
      { property: "og:title", content: "Aparência — VRCF Montra" },
      { property: "og:description", content: "Cores e estilo dos seus ecrãs." },
    ],
  }),
  component: () => (
    <AppShell title="Aparência">
      <EmptyState
        icon={Palette}
        title="Disponível na fase seguinte"
        description="As cores e o estilo da marca chegam numa fase posterior."
      />
    </AppShell>
  ),
});
