# Contexto do Projeto - Mochilinha / Copiloto

## Sobre o Aplicativo
- **Nome**: Mochilinha (Copiloto)
- **App ID**: `com.copilotrider.app`
- **Objetivo**: Gestão Financeira, Corridas, Metas e Manutenção Inteligente para Motoboys e Entregadores.
- **Stack Frontend**: React 19, TypeScript, Vite 8+, Tailwind CSS v4, Lucide React, Recharts, Motion.
- **Target Mobile**: Capacitor 7+ para Android nativo.
- **Ambiente**: Windows 11, Node.js v24, NPM v11, Android Studio JBR 21 (`C:\Program Files\Android\Android Studio1\jbr`), Android SDK 34/35/36 (`%LOCALAPPDATA%\Android\Sdk`).

## Como os Dados São Salvos
1. **Armazenamento Local (Offline-First / Room DB Simulation)**:
   - Função mestre: `persistAndEnqueueWorkManager` em `src/App.tsx`.
   - Chave de isolamento por conta de usuário no `localStorage` via `getStorageKeyForUser(user)`:
     - Visitante / Guest: `moto-dash-db-v3-guest`
     - Usuário Autenticado: `moto-dash-db-v3-usr_<email_sanitizado>`
   - Estado salvo na interface `LocalRoomDatabaseState`: corridas (`entries`), despesas (`expenses`), metas diária e semanal (`dailyGoal`, `weeklyGoal`), configuração de combustível/odômetro (`fuelConfig`), itens e histórico de manutenção (`maintenanceItems`), categorias e apps personalizados.

2. **Sincronização em Nuvem (WorkManager Sync)**:
   - Função executora: `runWorkManagerCloudSync` em `src/services/supabaseSync.ts`.
   - Executada automaticamente a cada novo registro, alteração de meta, manutenção ou exclusão.
   - Três camadas de redundância:
     1. **Supabase Oficial**: Persistência direta via `@supabase/supabase-js`.
     2. **Server Push API**: Endpoint `/api/cloud-sync/push`.
     3. **Relay de Mensageria**: Tópico encriptado para bridge entre dispositivos.

3. **Tabelas do Supabase**:
   - `public.pilots`: Guarda o cadastro oficial de pilotos/usuários (`id`, `email`, `name`, `phone`, `bike_model`, `password_hash`, `is_admin`, etc.).
   - `public.moto_settings`: Guarda metas, preferências e o snapshot completo do estado e perfil (`device_id` como PK).
   - `public.moto_entries`: Guarda cada corrida/ganho individualmente (`id` como PK, indexado por `device_id`).
   - `public.moto_expenses`: Guarda cada gasto individualmente (`id` como PK, indexado por `device_id`).
   - `public.investment_deposits`: Guarda depósitos de investimentos (`pending`, `confirmed`, `rejected`), garantindo que apenas o Admin possa confirmar.
   - `public.investment_events`: Guarda eventos de saque/resgate de investimentos.
   - Arquivo de criação do schema: `supabase_schema.sql` e `supabase_investments.sql`.

4. **Credenciais do Supabase**:
   - Arquivo `.env` configurado na raiz com os valores de `.env.example`:
     - `VITE_SUPABASE_URL="https://oryutbmvqyppkuncnjcj.supabase.co"` (com sanitização automática de `/rest/v1/`).
     - `VITE_SUPABASE_ANON_KEY="sb_publishable_N0KQf8yXmErYWfMSbbKg3A_fx-2z-32"`
   - Conexão testada e ativa via API REST do Supabase.

5. **Layout e Safe Area Insets (Android Edge-to-Edge)**:
   - Suporte completo a `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`.
   - Header superior com espaçamento dinâmico para não sobrepor a barra de status (relógio e notificações).
   - Barra inferior de navegação (`nav`) com padding inferior para não sobrepor os botões nativos/gestos do Android.
   - Telas de autenticação/perfil limpas (removidos títulos e botões excedentes).
   - Modal de edição do fundo de investimento: cards individuais de prévia para Cota Base, Rendimento Diário, 1º Saque (Carência), Projeção 30 Dias e Vencimento Total.
   - Fluxo de investimento: removidos avisos redundantes de confirmação prévia e simplificado o texto do botão para "Confirmar Investimento".

6. **Sistema de Notificações Nativas (@capacitor/local-notifications)**:
   - Notificações in-app (banners flutuantes, modais de sininho no topo) foram completamente substituídas por notificações nativas do sistema operacional.
   - Serviço central: `src/services/nativeNotifications.ts`. Dispara no Android via `@capacitor/local-notifications` com canais configurados (`maintenance` e `investments`), com fallback automático para Web Notification API no navegador desktop.
   - Permissão `android.permission.POST_NOTIFICATIONS` declarada no `AndroidManifest.xml` e ícone nativo `ic_stat_notify.xml` em `android/app/src/main/res/drawable/`.
   - Inclui botão de teste nas Configurações para validar disparos imediatos e programados.

7. **Modo de Segurança de Investimentos (Liberação Apenas pelo Admin)**:
   - O entregador **não pode** confirmar o próprio depósito para liberar cotas/saldo.
   - Ao confirmar o investimento e gerar o QR Code PIX, a solicitação é registrada com status `'pending'` (`public.investment_deposits`, endpoints no Express `/api/investment-deposits` e cache offline).
   - O Admin (`isAdmin = true`) possui o **Painel Gestor de PIX Pendentes** com botões para "Confirmar PIX e Liberar Cotas" ou "Rejeitar".
   - Somente após a confirmação do Admin o status transiciona para `'confirmed'`, liberando as cotas ativas no patrimônio e permitindo resgates futuros após a carência.
   - Observador em background/foreground (`src/hooks/useInvestmentWatcher.ts`) monitora os depósitos e emite notificações nativas quando:
     - Admin recebe novo depósito PIX aguardando validação ou solicitação de resgate.
     - Motoboy tem seu PIX confirmado pelo Admin (notificação nativa: "✅ PIX confirmado! Cotas liberadas").

## Scripts Disponíveis no package.json
- `npm run dev`: Inicia o servidor Express + Vite em `http://localhost:3000/`.
- `npm run dev:vite`: Inicia o Vite SPA diretamente em `http://localhost:5173/`.
- `npm run build`: Compila o frontend React/Vite para `dist/`.
- `npm run cap:sync`: Compila e sincroniza os assets com o projeto Android (`android/app/src/main/assets/public`).
- `npm run cap:open`: Abre o projeto no Android Studio.
- `npm run build:apk`: Pipeline completo que compila o front, sincroniza o capacitor e gera o APK assinado em `android/app/build/outputs/apk/release/app-release.apk`.
