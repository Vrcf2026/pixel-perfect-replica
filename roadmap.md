# VRCF Montra — plano

## Feito

- [x] Base de dados aplicada a partir do 01-schema.sql (10 tabelas, 3 funções, triggers, RLS)
- [x] Bucket "media" público + políticas por organização em storage.objects
- [x] Permissões: anon sem acesso a tabelas; authenticated com leitura/escrita
- [x] Fase 1 — autenticação, organização, painel, biblioteca, fontes (M3U), playlists e slides

## Por fazer (a pedido do utilizador)

- [x] Fase 2 — layouts: lista com miniaturas, 10 modelos (horizontal e vertical), editor visual com zonas (arrastar, redimensionar, camadas, ocultar/bloquear, atalhos), propriedades por tipo, estilo, guardar automático e "Ver conteúdo"
- [x] Fase 3 — ecrãs (estado, link, QR, comandos remotos, novo token, pré-visualização ao vivo, avisos), horários com vista semanal, aparência (tema, logótipo, fontes, moeda), painel inicial, player /player/$token (cache offline, ping, comandos, recarga diária, wake lock, service worker de media) e /preview/layout/$id
- [x] Gestão de clientes (superadmin): página Clientes (criar cliente + utilizador dono, limite de ecrãs, notas, suspender, entrar, apagar), vista de todos os ecrãs, acesso do superadmin a todas as organizações, ecrã preto em clientes suspensos. SQL em docs/sql/03-clientes-superadmin.sql
- [x] Fontes: botão Remover visível, seleção múltipla e remoção de duplicados
- [x] Produção: guia (docs/GUIA-PRODUCAO.md), ícones em lista fechada (player mais leve), script HDMI-CEC por horário
- [x] Fiabilidade: horário por ecrã, alertas por email (edge function check-screens + Resend), registo de exibições e página Relatórios (CSV), avisos urgentes
- [x] Conteúdo: modelos prontos, assistente de publicidade com IA (Lovable AI, fundos gerados), zonas de meteorologia (Open-Meteo) e notícias RSS
- [x] Arranque rápido (/arranque): lê site(s) + destaques do catálogo e prepara identidade, rodapé, playlist e layout para rever e criar
- [x] Relógio com 4 estilos (digital, anel de segundos, analógico, flip) e meteorologia com ícones animados (dia/noite)
- [x] Fontes: remoção em lotes (corrige erro ao remover muitas de uma vez)
