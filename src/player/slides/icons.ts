import {
  AlarmClock,
  Award,
  BadgePercent,
  Briefcase,
  Camera,
  Car,
  Clock,
  Coffee,
  Cpu,
  CreditCard,
  Gift,
  Globe,
  Hammer,
  HardDrive,
  Headphones,
  Heart,
  Home,
  KeyRound,
  Laptop,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  Monitor,
  Network,
  Package,
  Phone,
  Printer,
  Router,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  ThumbsUp,
  Truck,
  Users,
  Utensils,
  Video,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Ícones disponíveis nos slides. Lista fechada de propósito: importar a biblioteca
 * inteira tornava o player muito mais pesado a arrancar (ex.: Raspberry Pi).
 */
export const SLIDE_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  "shield-check": { icon: ShieldCheck, label: "Segurança" },
  camera: { icon: Camera, label: "Câmara" },
  video: { icon: Video, label: "Vídeo" },
  lock: { icon: Lock, label: "Cadeado" },
  "key-round": { icon: KeyRound, label: "Chave" },
  "alarm-clock": { icon: AlarmClock, label: "Alarme" },
  wifi: { icon: Wifi, label: "Wi-Fi" },
  router: { icon: Router, label: "Router" },
  network: { icon: Network, label: "Rede" },
  laptop: { icon: Laptop, label: "Portátil" },
  monitor: { icon: Monitor, label: "Monitor" },
  cpu: { icon: Cpu, label: "Processador" },
  "hard-drive": { icon: HardDrive, label: "Disco" },
  printer: { icon: Printer, label: "Impressora" },
  smartphone: { icon: Smartphone, label: "Telemóvel" },
  headphones: { icon: Headphones, label: "Auscultadores" },
  wrench: { icon: Wrench, label: "Reparação" },
  hammer: { icon: Hammer, label: "Obras" },
  globe: { icon: Globe, label: "Internet" },
  phone: { icon: Phone, label: "Telefone" },
  mail: { icon: Mail, label: "Email" },
  "map-pin": { icon: MapPin, label: "Localização" },
  clock: { icon: Clock, label: "Horário" },
  truck: { icon: Truck, label: "Entregas" },
  package: { icon: Package, label: "Encomendas" },
  "shopping-bag": { icon: ShoppingBag, label: "Compras" },
  tag: { icon: Tag, label: "Preço" },
  "badge-percent": { icon: BadgePercent, label: "Desconto" },
  gift: { icon: Gift, label: "Oferta" },
  "credit-card": { icon: CreditCard, label: "Pagamento" },
  megaphone: { icon: Megaphone, label: "Anúncio" },
  sparkles: { icon: Sparkles, label: "Novidade" },
  star: { icon: Star, label: "Destaque" },
  award: { icon: Award, label: "Qualidade" },
  "thumbs-up": { icon: ThumbsUp, label: "Aprovado" },
  heart: { icon: Heart, label: "Favorito" },
  users: { icon: Users, label: "Equipa" },
  briefcase: { icon: Briefcase, label: "Empresas" },
  home: { icon: Home, label: "Casa" },
  coffee: { icon: Coffee, label: "Café" },
  utensils: { icon: Utensils, label: "Restaurante" },
  scissors: { icon: Scissors, label: "Cabeleireiro" },
  car: { icon: Car, label: "Automóvel" },
};

export const SLIDE_ICON_NAMES = Object.keys(SLIDE_ICONS);

/** Aceita "shield-check", "ShieldCheck" ou "shield_check". */
export function findIcon(name?: string | null): LucideIcon | null {
  if (!name) return null;
  const kebab = name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
  return SLIDE_ICONS[kebab]?.icon ?? null;
}
