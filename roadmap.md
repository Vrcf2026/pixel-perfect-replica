# VRCF Montra — plano

## Feito

- [x] Base de dados aplicada a partir do 01-schema.sql (10 tabelas, 3 funções, triggers, RLS)
- [x] Bucket "media" público + políticas por organização em storage.objects
- [x] Permissões: anon sem acesso a tabelas; authenticated com leitura/escrita
- [x] Fase 1 — autenticação, organização, painel, biblioteca, fontes (M3U), playlists e slides

## Por fazer (a pedido do utilizador)

- [x] Fase 2 — layouts: lista com miniaturas, 10 modelos (horizontal e vertical), editor visual com zonas (arrastar, redimensionar, camadas, ocultar/bloquear, atalhos), propriedades por tipo, estilo, guardar automático e "Ver conteúdo"
- [x] Fase 3 — ecrãs (estado, link, QR, comandos remotos, novo token, pré-visualização ao vivo, avisos), horários com vista semanal, aparência (tema, logótipo, fontes, moeda), painel inicial, player /player/$token (cache offline, ping, comandos, recarga diária, wake lock, service worker de media) e /preview/layout/$id
