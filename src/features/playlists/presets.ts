import type { ItemData, ItemKind } from "./contract";

export type Preset = {
  id: string;
  label: string;
  hint: string;
  kind: ItemKind;
  data: ItemData;
  duration_s?: number;
};

/** Modelos prontos: criam um item já preenchido que depois só se ajusta. */
export const PRESETS: Preset[] = [
  {
    id: "lista_servicos",
    label: "Lista de serviços",
    hint: "Quadro com todos os serviços e preços",
    kind: "service",
    duration_s: 16,
    data: {
      template: "list",
      title: "Os nossos serviços",
      subtitle: "Pergunte ao balcão",
      footer: "Orçamentos gratuitos",
      highlight: true,
      page_s: 8,
      list: [
        {
          icon: "wrench",
          title: "Reparação de computadores",
          note: "Portáteis e fixos, diagnóstico rápido",
          price: "",
        },
        {
          icon: "printer",
          title: "Fotocópias e impressões",
          note: "A preto e a cores, A4 e A3",
          price: "",
        },
        {
          icon: "hard-drive",
          title: "Recuperação de dados",
          note: "Discos, pens e cartões",
          price: "",
        },
        {
          icon: "laptop",
          title: "Formatação e instalação",
          note: "Windows, programas e antivírus",
          price: "",
        },
        {
          icon: "wifi",
          title: "Redes e Wi-Fi",
          note: "Instalação e melhoria de cobertura",
          price: "",
        },
        {
          icon: "camera",
          title: "Videovigilância e alarmes",
          note: "Instalação certificada",
          price: "",
        },
      ],
    },
  },
  {
    id: "promo",
    label: "Promoção da semana",
    hint: "Produto com preço antigo riscado",
    kind: "product",
    data: {
      name: "Nome do produto",
      price: "79,90",
      old_price: "99,90",
      badge: "Promoção",
      category: "Só esta semana",
      template: "photo_left",
    },
  },
  {
    id: "novidade",
    label: "Novidade",
    hint: "Produto novo em destaque",
    kind: "product",
    data: {
      name: "Novo produto",
      price: "149,00",
      badge: "Novidade",
      badge_color: "#16A34A",
      template: "photo_right",
    },
  },
  {
    id: "servico",
    label: "Serviço",
    hint: "O que faz, com 3 pontos fortes",
    kind: "service",
    data: {
      title: "Instalação de videovigilância",
      subtitle: "Proteja a sua casa ou empresa",
      bullets: ["Orçamento gratuito", "Instalação certificada", "Acesso pelo telemóvel"],
      icon: "shield-check",
      template: "big_title",
    },
  },
  {
    id: "menu",
    label: "Menu do dia",
    hint: "Pratos e preço, para cafés e restaurantes",
    kind: "text",
    data: {
      title: "Menu do dia",
      body: "Sopa de legumes\nBacalhau à Brás\nBebida e café\n\n9,50 €",
      align: "center",
      size: "l",
    },
    duration_s: 12,
  },
  {
    id: "horario",
    label: "Horário",
    hint: "Horas de abertura",
    kind: "text",
    data: {
      title: "Horário",
      body: "Segunda a sexta: 9h00 – 19h00\nSábado: 9h00 – 13h00\nDomingo: encerrado",
      align: "center",
      size: "m",
    },
  },
  {
    id: "contratar",
    label: "Estamos a contratar",
    hint: "Anúncio de emprego com QR",
    kind: "service",
    data: {
      title: "Estamos a contratar",
      subtitle: "Venha fazer parte da equipa",
      bullets: ["Função: …", "Horário: …", "Envie o CV para …"],
      icon: "users",
      template: "big_title",
    },
  },
  {
    id: "qr",
    label: "Siga-nos / site",
    hint: "QR para site, Instagram ou Google",
    kind: "qr",
    data: { url: "https://", title: "Siga-nos", caption: "Aponte a câmara do telemóvel" },
  },
  {
    id: "aviso",
    label: "Aviso",
    hint: "Encerramento, feriado, obras…",
    kind: "text",
    data: {
      title: "Aviso",
      body: "Encerrado no dia … por motivo de …",
      align: "center",
      size: "l",
      bg: "#B91C1C",
    },
  },
  {
    id: "catalogo",
    label: "Produtos do catálogo",
    hint: "Puxa os produtos marcados para a montra",
    kind: "catalog_feed",
    data: {
      url: "https://SEU-PROJETO.supabase.co/rest/v1/products?select=name,price,image_url,category&montra=eq.true",
      headers: { apikey: "CHAVE-ANON", Authorization: "Bearer CHAVE-ANON" },
      map: { name: "name", price: "price", image_url: "image_url", category: "category" },
      limit: 20,
      per_item_s: 8,
      template: "photo_left",
      price_multiplier: 1,
    },
  },
];
