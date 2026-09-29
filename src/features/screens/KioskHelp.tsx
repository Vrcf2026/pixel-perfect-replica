import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function hm(t: string, deltaMin: number) {
  const [h, m] = t.split(":").map(Number);
  const total = ((h ?? 0) * 60 + (m ?? 0) + deltaMin + 1440) % 1440;
  return { h: Math.floor(total / 60), m: total % 60 };
}

export function cecCron(hours: {
  open_days: number[];
  open_from: string | null;
  open_to: string | null;
}) {
  const days = hours.open_days
    .map((d) => d % 7)
    .sort((a, b) => a - b)
    .join(",");
  const on = hm(hours.open_from ?? "09:00", -5);
  const off = hm(hours.open_to ?? "19:00", 10);
  return `# sudo apt install -y cec-utils
${on.m} ${on.h} * * ${days} echo 'on 0' | cec-client -s -d 1
${on.m} ${on.h} * * ${days} echo 'as' | cec-client -s -d 1
${off.m} ${off.h} * * ${days} echo 'standby 0' | cec-client -s -d 1`;
}

function Block({ text }: { text: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-[#0F1E36] p-3 pr-12 text-xs leading-relaxed text-white">
        {text}
      </pre>
      <Button
        size="icon"
        variant="secondary"
        className="absolute top-2 right-2 h-7 w-7"
        title="Copiar"
        onClick={() =>
          void navigator.clipboard.writeText(text).then(() => toast.success("Copiado."))
        }
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function KioskHelp({
  url,
  hours,
}: {
  url: string;
  hours?: { open_days: number[]; open_from: string | null; open_to: string | null };
}) {
  const flags =
    "--kiosk --autoplay-policy=no-user-gesture-required --noerrdialogs --disable-infobars";
  const chrome = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" ${flags} --disable-session-crashed-bubble --overscroll-history-navigation=0 ${url}`;
  const edge = `"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk ${url} --edge-kiosk-type=fullscreen --autoplay-policy=no-user-gesture-required --no-first-run`;
  const pi = `[Desktop Entry]
Type=Application
Name=Montra
Exec=chromium-browser ${flags} --check-for-update-interval=31536000 ${url}`;
  return (
    <Tabs defaultValue="windows">
      <TabsList>
        <TabsTrigger value="windows">Windows</TabsTrigger>
        <TabsTrigger value="pi">Raspberry Pi</TabsTrigger>
        <TabsTrigger value="tv">Smart TV / Android</TabsTrigger>
      </TabsList>
      <TabsContent value="windows" className="space-y-3 pt-2 text-sm">
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Crie um utilizador local só para a TV com início de sessão automático (netplwiz).</li>
          <li>Em Energia, ponha o ecrã e a suspensão em "Nunca".</li>
          <li>
            Carregue Win+R, escreva <code>shell:startup</code> e crie lá um atalho com o comando
            abaixo.
          </li>
        </ol>
        <div className="text-xs font-medium">Google Chrome</div>
        <Block text={chrome} />
        <div className="text-xs font-medium">Microsoft Edge</div>
        <Block text={edge} />
      </TabsContent>
      <TabsContent value="pi" className="space-y-3 pt-2 text-sm">
        {hours?.open_from && hours.open_to ? (
          <>
            <p className="text-muted-foreground">
              <b>Ligar e desligar a TV sozinha</b> (HDMI-CEC): instale o <code>cec-utils</code> e
              acrescente ao <code>crontab -e</code>. Liga 5 minutos antes de abrir e desliga 10
              minutos depois de fechar.
            </p>
            <Block text={cecCron(hours)} />
          </>
        ) : null}
        <p className="text-muted-foreground">
          Raspberry Pi OS com ambiente gráfico. Grave como{" "}
          <code>~/.config/autostart/montra.desktop</code> e desative o "screen blanking" em{" "}
          <code>raspi-config</code> → Display.
        </p>
        <Block text={pi} />
      </TabsContent>
      <TabsContent value="tv" className="space-y-3 pt-2 text-sm text-muted-foreground">
        <p>
          Numa box Android ou Smart TV com navegador, abra o link abaixo em ecrã inteiro. Para
          arrancar sozinho, use uma app de "kiosk browser" (ex.: Fully Kiosk Browser) com este
          endereço como página inicial.
        </p>
        <Block text={url} />
      </TabsContent>
    </Tabs>
  );
}
