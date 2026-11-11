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
   - Solicitação automática de permissão no login e inicialização do app no Android 13+.
   - Watcher de investimentos otimizado (polling a cada 10s e eventos de visibilidade/foco) garantindo que depósitos pendentes só sejam marcados como vistos após a notificação ser entregue com sucesso.
   - Lista de administradores confiáveis expandida para incluir `junior2026izi@gmail.com` e checagem de flag `is_admin` do Supabase.

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
- Build do AAB (Google Play): Executado via `cd android ; .\gradlew.bat bundleRelease` gerando o arquivo assinado em `android/app/build/outputs/bundle/release/app-release.aab`.

## Ícone Oficial do Aplicativo Mochilinha
- **Design**: Mochila de entrega tecnológica/3D voltada para entregadores e motoboys, com iluminação em neon laranja/ciano e fundo escuro em degradê midnight slate (`#151B27`).
- **Resoluções Nativas Geradas**:
  - `mipmap-mdpi`: 48x48 (padrão e redondo) / 108x108 (foreground)
  - `mipmap-hdpi`: 72x72 (padrão e redondo) / 162x162 (foreground)
  - `mipmap-xhdpi`: 96x96 (padrão e redondo) / 216x216 (foreground)
  - `mipmap-xxhdpi`: 144x144 (padrão e redondo) / 324x324 (foreground)
  - `mipmap-xxxhdpi`: 192x192 (padrão e redondo) / 432x432 (foreground)
- **Play Store Icon**: `android/app/play_store_icon.png` (512x512)
- **Script de automação**: `scripts/generate_android_icons.ps1`

## Política de Privacidade (Google Play Store & LGPD)
- **Arquivo HTML**: `public/privacidade.html` e `public/privacy.html`.
- **Roteamento Vercel (`vercel.json`)**:
  - `/privacidade`
  - `/politica-de-privacidade`
  - `/privacy`
  - `/privacy-policy`
  - `/privacidade.html`
- **Conteúdo**: Abrange conformidade total com LGPD (Art. 18), dados coletados (cadastrais, faturamento e despesas), permissões do Android (`POST_NOTIFICATIONS`), segurança via Supabase/Vercel e canal de exclusão de dados via e-mail do DPO (`junior2026izi@gmail.com`).
- **Acesso no App**: Card com link direto nas Configurações do aplicativo.

## Ajuste Inteligente de Saldo do Motoboy
- **Componente**: [`src/components/AdjustBalanceModal.tsx`](file:///c:/Users/swami/Downloads/Copiloto/src/components/AdjustBalanceModal.tsx).
- **Acesso**: Botão **"Ajustar Saldo"** no Card 3 da tela de Finanças (`activeTab === 'billing'`) e no Card de Saldo Atual do Painel (`dashboard`).
- **Comportamento Automático**:
  - Se o novo saldo for maior que o atual (excedente): cria automaticamente uma transação de Ganho (Entrada) no valor da diferença com app `ajuste` e turno `ajuste` ("Ajuste de Saldo").
  - Se o novo saldo for menor que o atual (faltante): cria automaticamente uma transação de Gasto (Saída) no valor da diferença com categoria `ajuste` ("Ajuste de Saldo").
  - Sincronização automática com Room Database e Supabase Cloud Sync.
- **Barra Superior**: Botão flutuante de calculadora do topo foi removido, mantendo a barra superior limpa e focada.
- **Data**: 10/11/2026 18:21 (UTC-3)
- **APK Release**: `android/app/build/outputs/apk/release/app-release.apk` (4.56 MB)
- **AAB Bundle**: `android/app/build/outputs/bundle/release/app-release.aab` (4.41 MB)
- **Assinatura**: `release-key.jks` (alias `mochilinha-release`)

## Sincronização de Despesas da Casa / Moto (Correção 11/11/2026)
- **Causa raiz**: versões antigas do app (APK) nunca enviavam `householdExpenses` / `bikeExpenses` ao Supabase (ficavam só no aparelho) e o download ignorava esses campos. Aluguel/internet do admin existiam apenas no APK.
- **Correção** (`src/services/supabaseSync.ts`): (1) `runWorkManagerCloudSync` lê a nuvem antes de gravar e nunca deixa lista padrão/zerada sobrescrever lista configurada; (2) `downloadCloudDataToLocal` envia a configuração local ao banco quando a nuvem ainda não a tem (`pushExpenseConfigIfCloudMissing`); (3) critério único `isHouseholdListCustomized` / `isBikeListCustomized`.
- **Teste E2E**: `brain/.../scratch/sync_test.ts` (2 aparelhos simulados, conta descartável) - PASSOU.
- **Atenção**: é preciso instalar um NOVO APK (com esta correção) no aparelho do admin e abri-lo logado uma vez para os dados subirem ao banco.

- **APK Release (11/11/2026 09:02)**: `android/app/build/outputs/apk/release/app-release.apk` (4.35 MB), assinado (apksigner v2 OK), contem a correcao de sincronizacao das despesas da casa/moto e o Ajuste de Saldo. **Atencao de build**: o `JAVA_HOME` da sessao e o JDK 17; o Gradle exige JDK 21. Usar `JAVA_HOME=C:\Program Files\Android\Android Studio1\jbr` ao rodar `gradlew.bat` (senao falha com 'invalid source release: 21').

## Dedução de Despesas do Orçamento Mensal & Feedback de Contas Quitadas (11/11/2026)
- **Dedução do Orçamento ao Lançar Gasto**:
  - Tanto na aba **Despesas da Casa** quanto na aba **Despesas da Moto**, o Card 1 ("Total Contas a Pagar / Mês") e o Card 2 ("Separar por Dia") agora exibem o valor restante real a pagar (`monthlyHouseholdRemaining` e `monthlyBikeRemaining`), deduzindo automaticamente qualquer despesa já lançada no mês de competência selecionado (`selectedFinanceMonth`).
  - No rodapé do Card 1, mostra claramente quanto já foi quitado no mês e o orçamento total estipulado.
- **Feedback Visual de Conta Quitada**:
  - Quando uma despesa do mês tem seu pagamento lançado (ex: Aluguel de R$ 1.300,00), o card ganha feedback visual esmeralda (`bg-emerald-950/20 border-emerald-500/60`), badge `✓ Quitado`, badge no status `✅ Quitado no mês (R$ 1.300,00)` e o botão de ação passa a ser `✓ Quitado (+ Lançar Outro)`.
  - Elimina alertas falsos de "vencido" para contas já pagas no mês.
- **Navegador de Mês & Filtro de Status**:
  - Barra de navegação rápida com anterior/próximo e dropdown contendo meses passados e meses futuros até +12 meses (com atalho para "Mês Atual").
  - Filtros de status: `Todas`, `⏳ A Pagar`, `✅ Quitadas` e `🚨 Vencidas`.
  - Cronograma de vencimentos e ciclos sincronizado com os pagamentos efetuados no mês.

## Anular e Ativar Ganhos/Gastos no Histórico (11/11/2026)
- **Funcionalidade**:
  - Na tela de Histórico, cada item de ganho ou gasto possui um botão dedicado para **Anular** (ícone `Ban`) ou **Ativar/Reativar** (ícone `CheckCircle2`).
  - Função: `toggleEntryOrExpenseCancelled(id, 'ganho' | 'gasto')`.
- **Efeito Financeiro Inteligente**:
  - Quando um item é **anulado** (`isCancelled: true`), ele deixa de entrar na soma de faturamento, despesas, quilometragem rodada e saldo atual/lucro, sem ser excluído permanentemente do banco ou do histórico.
  - Ao ser **reativado** (`isCancelled: false`), volta a compor os totais normalmente.
- **Feedback Visual no Histórico**:
  - Item anulado fica esmaecido com valor riscado (`line-through text-slate-500`) e exibe a badge `🚫 Anulado`.
  - Botão de alternância com estado visual claro: botão de ativação em verde esmeralda quando anulado, e botão sutil de anulação quando ativo.
  - Filtro adicional no topo do histórico para visualizar: `Todos os Status`, `Ativos` ou `🚫 Anulados`.
- **APK Release (11/11/2026 13:19)**: `android/app/build/outputs/apk/release/app-release.apk` (4.36 MB), assinado (apksigner v2 OK), commit `a4ed917` enviado ao GitHub `main`. Contém dedução orçamentária, feedback de contas quitadas, filtros de competência/status e anulação/ativação no histórico.
