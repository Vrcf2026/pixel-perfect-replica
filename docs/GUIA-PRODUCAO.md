# VRCF Montra — pôr em produção

## 1. Base de dados (Lovable)
Pedir ao Lovable, por esta ordem, cada um "exatamente como está":
1. `docs/sql/03-clientes-superadmin.sql` (se ainda não foi aplicado)
2. `docs/sql/04-alertas-exibicoes-campanhas.sql`
3. Regenerar os tipos do Supabase.

## 2. Resend (envio dos emails de alerta)
1. Criar conta em resend.com.
2. **Domains → Add domain → `vrcf.pt`**. O Resend mostra 3–4 registos DNS (DKIM `resend._domainkey`, SPF e MX num subdomínio `send`). Criar esses registos no DNS do `vrcf.pt`. Como ficam num subdomínio, o email atual (geral@vrcf.pt) não é afetado.
3. Esperar pela verificação (normalmente minutos).
4. **API Keys → Create** com permissão "Sending access". Copiar a chave (`re_…`).

## 3. Alertas agendados (Lovable)
Pedir ao Lovable:
- Publicar a edge function `supabase/functions/check-screens` (sem verificação JWT, já está no `config.toml`).
- Criar os secrets: `RESEND_API_KEY` (chave do passo 2), `CRON_SECRET` (uma palavra-passe longa qualquer) e `APP_URL` (ex.: `https://montra.vrcf.pt`).
- Agendar com pg_cron + pg_net, de 5 em 5 minutos, um POST à função com o cabeçalho `x-cron-secret: <CRON_SECRET>`.
- Confirmar que o Lovable AI está ativo e que `LOVABLE_API_KEY` está disponível para as funções de servidor da app (assistente de publicidade e notícias RSS).

Depois, em **Clientes → Alertas da plataforma**, pôr o seu email e o remetente (ex.: `alertas@vrcf.pt`).
Cada cliente define os emails dele em **Definições**; o horário de cada ecrã define-se na página do ecrã.

## 4. Domínio próprio (antes de instalar em clientes!)
1. Lovable → Project Settings → **Domains** → ligar `montra.vrcf.pt`.
2. Criar no DNS os registos que o Lovable indicar e esperar pela verificação e pelo certificado.
3. Atualizar o secret `APP_URL`.
Os links dos ecrãs usam o domínio de onde se abre o painel: abra sempre o painel pelo domínio novo antes de copiar links de ecrãs.

## 5. Instalar na loja
1. Criar o ecrã, escolher layout, definir o horário da loja.
2. No aparelho (mini PC ou Raspberry Pi), usar os comandos do separador **Instalar** do ecrã.
3. No Pi, o mesmo separador tem as linhas para ligar/desligar a TV por HDMI-CEC conforme o horário.
4. Deixar a correr uma semana e ver **Relatórios** e os avisos na página do ecrã.

## 6. Segurança
- Revogar o token do GitHub usado para as alterações.
- Confirmar que o registo público de utilizadores está desligado.
