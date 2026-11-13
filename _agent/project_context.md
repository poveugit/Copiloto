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

## Vencimentos do Dia no Painel, Modais no Header & Faturamento Futuro Previsto (11/11/2026)
- **1. Card de Vencimentos do Dia Oculto Quando Vazio**:
  - Na tela de Painel (`activeTab === 'dashboard'`), o card de vencimentos do dia agora verifica se há contas pendentes vencendo hoje (tanto de casa quanto da moto).
  - Caso não haja nenhum vencimento pendente no dia (`allPendingDueToday.length === 0`), o componente retorna `null` e o card fica 100% oculto, despoluindo a tela inicial.
  - Quando houver contas com vencimento hoje, o card aparece com destaque, contadores, saldo atual vs. valor a vencer e botão de registrar pagamento.

- **2. Botões de Acesso Rápido a Extrato MEI e Meta Reversa na Barra Superior**:
  - No `<header>`, foram adicionados dois botões de atalho:
    - Botão **Extrato MEI** (ícone `Printer`, estilizado em roxo): aciona `setShowRelatorioMeiModal(true)`.
    - Botão **Meta Reversa** (ícone `Target`, estilizado em laranja `#FF6A1A`): aciona `setShowMetaReversaModal(true)`.
  - Ambos com tooltip e texto responsivo (`hidden lg:inline`), acessíveis de qualquer tela do aplicativo com 1 clique.

- **3. Faturamento Futuro Previsto na Tela de Finanças**:
  - **Interface `ProjectedRevenueItem`**: id, data (`date`), valor (`amount`), descrição (`description`), aplicativo/origem (`app`), status (`pending` | `realized` | `cancelled`), notas (`notes`) e data de criação (`createdAt`).
  - **Sub-aba dedicada na Central de Finanças**: `billingSubTab === 'projecao'` com o rótulo **`🔮 Faturamento Previsto`**.
  - **Card na Aba Mensal**: Exibe o Faturamento Previsto Pendente da competência selecionada e a Projeção Total Consolidada (Ganhos Reais + Previsto), com botões de atalho `+ Lançar Faturamento Futuro` e `Ver Previsões`.
  - **Métricas Consolidadas na Sub-Aba**:
    - 1. Previsto a Receber (pendentes no mês).
    - 2. Faturamento Já Realizado no Mês.
    - 3. Projeção Total do Mês (Real + Previsto).
    - 4. Lucro Limpo Projetado (Balanço com Despesas Totais de Casa e Moto).
  - **Ações na Lista**:
    - **✓ Confirmar Recebimento**: Transforma a previsão em corrida/ganho real em `entries` com 1 clique, marca o status como `realized` e atualiza os ganhos do mês.
    - **Editar**: Abre o modal para atualizar valor, data ou detalhes.
    - **Anular / Reativar**: Alterna o status para `cancelled` ou `pending`.
    - **Excluir**: Remove a previsão com confirmação.
  - **Filtros de Status**: `Todas`, `⏳ Pendentes`, `✅ Recebidas / Realizadas` e `🚫 Canceladas`.
  - **Modal de Lançamento / Edição**:
    - Seleção de data com atalhos: `Hoje`, `Amanhã`, `Sexta`, `Sábado`, `Domingo`, `+7 dias`.
    - Campo de valor com atalhos numéricos (`R$ 50`, `R$ 100`, `R$ 150`, `R$ 200`, `R$ 250`, `R$ 300`, `R$ 500`).
    - Campo de descrição com sugestões: `Entrega Agendada`, `Turno Fim de Semana`, `Frete Particular`, `Fixo Semanal`, `Meta do Dia`.
    - Seleção de canal: `Particular`, `iFood`, `99Moto`, `Uber Flash`, `Rappi`, `Frete`, `Fixo Semanal`, `Outro`.
  - **Persistência Offline & Online**: Integrado ao `LocalRoomDatabaseState` e à sincronização da nuvem (`WorkManagerCloudSync`).

- **4. Remoção do Card de DAS-MEI na Tela de Finanças**:
  - O card estático de lembrete do DAS-MEI que ficava no topo da tela de Finanças foi completamente removido, deixando o fluxo direto da seleção de abas para o conteúdo financeiro.
  - O acesso ao Extrato MEI e à Meta Reversa permanece direto e prático através dos botões dedicados na barra superior.

## Gestão de Despesas da Moto e da Casa: Critérios de Quitação, Duplicação e Limpeza Visual (11/11/2026)
- **1. Critério Formal de Quitação de Despesas (Moto e Casa)**:
  - Implementado em `getExpenseDueInfo` e consolidado em `financialIntelligence`.
  - Uma despesa é formalmente considerada **quitada** no mês de competência (`targetYM`) quando:
    1. For marcada explicitamente como quitada no mês (`item.paidMonths?.includes(ym)`).
    2. A data do último pagamento registrado estiver no mês selecionado (`item.lastPaidDate?.startsWith(ym)`).
    3. O valor pago lançado no mês cobrir o valor orçado (`expectedVal > 0 && paidInMonth >= expectedVal`).
    4. Houver pagamento lançado para despesa sem valor pré-fixado (`expectedVal === 0 && paidInMonth > 0`).
  - Badge interativa `[✓ Quitado]` / `[⏳ A Pagar]` no cabeçalho de cada card permite alternar manualmente a quitação sem burocracia (`toggleBikeExpensePaidStatus` / `toggleHouseholdExpensePaidStatus`).
- **2. Feedback Visual Dinâmico no Botão Principal**:
  - Removido o texto fixo "quitado" do botão de ação em ambas as abas (Moto e Casa).
  - Se a despesa estiver **pendente**: botão verde esmeralda `[+ Lançar Gasto]`, abrindo o modal com a categoria pré-selecionada.
  - Se a despesa estiver **quitada**: botão azul céu `[📋 Duplicar Despesa]`, transformando a ação em duplicação ágil tanto para despesas da moto quanto para contas da casa.
- **3. Função de Duplicação de Despesa**:
  - Funções `duplicateBikeExpense` e `duplicateHouseholdExpense`: criam uma nova despesa idêntica com identificador único (`bike_<timestamp>` / `house_<timestamp>`), sufixo `(Cópia)` e estado pendente (`paidMonths: []`, `lastPaidDate: undefined`).
  - Funções de matching (`matchesBikeExpense` e `matchesHouseholdExpense`) isolam o histórico: despesas vinculadas a um item original ou com nome genérico não se associam à cópia, mantendo a nova despesa pendente até que um gasto próprio seja efetuado.
- **4. Despoluição dos Cards de Despesas**:
  - Removidos os rótulos de texto `Editar` e `Excluir` dos cards de despesas da moto e da casa.
  - Mantidos apenas os botões compactos com ícones `Edit3` e `Trash2`, com tooltips explicativos e confirmação inline de exclusão.
- **5. Correção do Bloqueio de Alternância de Status (Quitado -> A Pagar)**:
  - **Causa Raiz**: Quando uma conta (como Aluguel ou Óleo da Moto) possuía um gasto já lançado no mês (`paidInMonth >= expectedVal`) ou data em `lastPaidDate`, a função `getExpenseDueInfo` forçava automaticamente o status para `paid`. Ao clicar para alternar para "A Pagar", o sistema apenas limpava `paidMonths`, mas a presença do gasto no extrato fazia a tela reavaliar imediatamente como "Quitado".
  - **Correção Implementada**:
    - Adicionado suporte ao array `unpaidMonths?: string[]` em `HouseholdExpenseItem` e `BikeExpenseItem`.
    - `isExplicitlyUnpaid`: Prioridade máxima no cálculo de status. Se a competência constar em `unpaidMonths`, o status do card é forçado para pendente/vencido (exibindo dias restantes, label de vencimento e botão `+ Lançar Gasto`), ignorando lançamentos passados.
    - Em `toggleHouseholdExpensePaidStatus` e `toggleBikeExpensePaidStatus`, a função inspeciona dinamicamente o status que está na tela (`currentDueInfo.status === 'paid'`) e transiciona perfeitamente entre `paidMonths` e `unpaidMonths`.
    - Ao lançar um novo pagamento pelo modal para essa despesa, a competência é automaticamente removida de `unpaidMonths`, retornando ao fluxo natural.
    - Solução aplicada e testada para **todos** os cards de despesas da Casa e da Moto.
  - **APK Release (11/11/2026 21:24)**: `android/app/build/outputs/apk/release/app-release.apk` (4.57 MB), assinado (`release-key.jks`, apksigner v2 OK). Contém todas as correções de quitação/duplicação das despesas da casa e moto, projeção de faturamento futuro e desbloqueio do toggle manual para "A Pagar".

## Reformulação Minimalista: Barra Superior e Tela de Configurações (11/11/2026)
- **1. Barra Superior Minimalista**:
  - Removidos fundos e bordas pesadas dos botões de ação:
    - **Extrato MEI**: estilo ghost transparente (`bg-transparent text-purple-400 hover:text-purple-300`).
    - **Meta Reversa**: estilo ghost transparente (`bg-transparent text-[#FF6A1A] hover:text-[#ff7b33]`).
    - **Menu Cockpit Hub**: fundo transparente minimalista, mantendo pulso sutil apenas durante turno ativo.
    - **Botão de Conta / Login Rápido**: fundo transparente com hover sutil, eliminando peso visual.
- **2. Tela de Configuração - Topo Sem Cards**:
  - Removido o card fechado do topo e os botões de `Redefinir Senha`, `Trocar Conta` e `Sair`.
  - Nome e e-mail do motoboy posicionados no topo em tipografia elegante e minimalista integrada ao cabeçalho.
- **3. Remoção do Card de Sincronização em Nuvem**:
  - Removido o card com botões de upload/download e código de backup da tela de configurações, mantendo o app leve, visto que a sincronização com o Supabase já roda automaticamente em segundo plano.
- **4. Redesign Minimalista de Metas Financeiras**:
  - `Meta Diária`, `Meta Semanal / Mensal` e `Meta Personalizada de Ganhos` reestruturadas sem o container de card envolvente.
  - Linhas divisórias sutis e inputs alinhados e limpos.
- **5. Seção e Modais de Sistema & Permissões Suavizados**:
  - Notificações do Sistema, Permissão de Voz e Localização GPS limpos:
    - Removidos fundos e bordas de caixas atrás dos ícones (ícones exibidos de forma pura e direta).
    - Removidos excessos de textos e tutoriais redundantes de 3 passos, mantendo explicações diretas e objetivas.
    - Botões suavizados (sem blocos sólidos pesados, adotando estilo refinado com borda e hover suaves).
  - Modais nativos de Voz e GPS também atualizados com design minimalista, ícones limpos e botões suavizados.
- **Validação e Build**:
  - `npx tsc --noEmit`: 100% sem erros.
  - `npm run build`: compilado com sucesso (dist gerada em 6.48s).
  - `npx cap sync android`: sincronizado perfeitamente com os assets nativos do Android.

## Correção Global de Contraste e Legibilidade no Modo Claro (12/11/2026)
- **1. Sincronização e Suporte do Tema**:
  - `isDark` sincroniza dinamicamente a classe `.dark` em `document.documentElement` tanto no estado inicial quanto no `useEffect`.
  - Fortalecimento das variáveis globais: `mutedText` (`text-slate-600` no modo claro), `primaryText` (`text-slate-900`), `secondaryText` (`text-slate-800`), `dividerBorder` (`border-slate-200`) e `inputSurface` (`bg-slate-50 border-slate-300 text-slate-900`).
- **2. Tela de Configurações**:
  - Títulos, identificação do motoboy, metas e rótulos adaptados para textos escuros no modo claro, eliminando textos claros/apagados.
  - Botões de teste e permissão com bordas e textos escuros de alto contraste (`text-slate-700 hover:text-slate-900`).
- **3. Badges de Vencimento de Despesas (`getExpenseDueInfo`)**:
  - Migradas todas as badges de status (`paid`, `partial`, `future`, `overdue`, `today`, `near`) para usar variantes de alto contraste no modo claro com fallbacks escuros no `dark:`:
    - Quitado: `bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400`.
    - Parcial: `bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300`.
    - Vencido/Hoje: `bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300`.
    - Próximo: `bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300`.
    - Futuro: `bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300`.
- **4. Despesas da Moto e da Casa**:
  - Badges de total cadastrado atualizadas para `bg-slate-100 text-slate-700 border-slate-200`.
  - Botões de cancelar exclusão (`✕`) e caixas de rateio ("Reserva Mensal Equivalente" e "Separar por dia") com textos escuros e fundos suaves no modo claro.
- **5. Faturamento Previsto & Painel**:
  - Modal de faturamento futuro: botões de atalho de data (`Hoje`, `Amanhã`, `Sexta`, etc.) e sugestões rápidas adaptados com `bg-slate-100 text-slate-700 border-slate-300`.
  - Banner de Turno Ativo no Painel: textos de odômetro e velocidade com alto contraste (`text-emerald-700`, `text-emerald-800`, `text-sky-800` no modo claro).
- **6. Componentes e Modais Externos**:
  - `AdjustBalanceModal`: textos explicativos, botão Zerar e caixas de excedente/faltante com contraste total.
  - `ControleTurnoModal`: caixas de métricas do odômetro GPS com fundo claro e textos escuros (`text-slate-900`, `text-emerald-700`, `text-sky-700`).
  - `InvestimentosScreen`: carência, resumo do plano, cotas e pop-ups de confirmação/resgate adaptados para `primaryText` e `secondaryText`.
  - `RadarCorridaModal`: ganhos brutos, custos e sobras livres com tipografia escura de alta legibilidade.
  - `RelatorioMeiModal` & `MetaReversaModal`: cabeçalhos, divisões diárias e badges fiscais revisados.
  - `QuickCalculatorModal`: display, atalhos rápidos e botão cancelar adaptados ao modo claro.
- **Validação Rigorosa**:
  - `npx tsc --noEmit`: 100% aprovado sem erros.
  - `npm run build`: compilado com sucesso em 4.94s.
  - `npx cap sync android`: sincronizado com o projeto nativo do Android.
  - **APK Release (12/11/2026 01:13)**: `android/app/build/outputs/apk/release/app-release.apk` (4.57 MB / 4.570.653 bytes), assinado (`release-key.jks`, verificado com `apksigner` Scheme v2 OK), commit `889f7ef` enviado ao GitHub `main`. Contém redesign minimalista da barra superior e tela de configurações, modais de sistema e permissões suavizados e correção global de contraste em todos os textos no modo claro.

## Redesign Minimalista Completo da Tela Principal (Painel) & Efeitos Animados (12/11/2026)
- **1. Correção Definitiva de Legibilidade no Modo Escuro (`Custo Operacional & Autonomia da Moto` e `dark:` no Tailwind v4)**:
  - **Causa Raiz**: No Tailwind CSS v4 (`@import "tailwindcss";`), a variante `dark:` padrão utilizava `@media (prefers-color-scheme: dark)` em vez da classe `.dark` no `<html>`. Quando o sistema operacional estava em modo claro e o app em modo escuro, `text-slate-900 dark:text-white` aplicava `text-slate-900` sobre fundo escuro, tornando o texto `"Custo Operacional & Autonomia da Moto"` ilegível.
  - **Solução Dupla**:
    - Adicionado `@custom-variant dark (&:where(.dark, .dark *));` no topo de `src/index.css` para que todas as classes `dark:*` respeitem a classe `.dark` do app.
    - Aplicado explicitamente `${primaryText}` (`isDark ? 'text-slate-100' : 'text-slate-900'`) em `"Custo Operacional & Autonomia da Moto"` e em todos os títulos da tela principal.
- **2. Remoção dos Cards Principais e Sub-Cards com Fundo no Painel (`activeTab === 'dashboard'`)**:
  - Removidos todos os containers de cards pesados (`${surfaceCard}`, sombras e bordas duplas) que separavam os blocos principais (Turno Ativo, Odômetro Total, Saldo Atual do Motoboy, Reservas Obrigatórias, Ganhos por Período & Produtividade, Desempenho nos Últimos 7 Dias, Análise de Turno Mochilinha, Saúde da Moto e Faturamento por Aplicativo).
  - Seções principais agora são separadas por linhas divisórias sutis (`border-b ${dividerBorder}` e `lg:border-r ${dividerBorder}`).
  - Todos os sub-cards internos (Custo Real/KM, Autonomia, Lucro Limpo/KM, Telemetria do Combustível, + Faturamento / - Gastos Totais, 6 Reservas Individuais, 4 Caixinhas de Resumo, Sub-itens da Meta Personalizada, 4 Indicadores de Produtividade e 3 Itens de Saúde da Moto) tiveram seus fundos sólidos removidos (`bg-transparent`), mantendo apenas borda fina e suave (`border ${dividerBorder}`).
  - Todos os botões da tela principal (`+ Abastecer`, `Ver Detalhes do KM`, `Este Mês / Geral / Personalizado`, `Ajustar Saldo`, `Registrar Pagamento`, `+ Corrida / Gasto`, `Extrato`, `Ajustar` das reservas e metas, `Perguntar à Mochilinha` e `Histórico`) agora são **sem fundo (`bg-transparent`)**, com bordas finas e suaves.
- **3. Efeitos Animados em Gráficos, Barras de Progresso e Números**:
  - **Números (`AnimatedNumber` + `.dashboard-number-anim`)**: Contagem progressiva suave (`requestAnimationFrame` com curva `easeOutQuart` de 650ms) e reveal animado em todos os indicadores numéricos principais do Painel (Odômetro Total, Saldo Atual, Faturamento, Gastos, Custo/KM, Autonomia, Lucro/KM, Reservas Diárias, Metas, Produtividade/Hora, Total 7 Dias e Ranking de Apps).
  - **Barras de Progresso (`.dashboard-progress-fill`)**: Animação fluida de preenchimento horizontal (`dashboardProgressGrow`) combinada com efeito de brilho contínuo (`dashboardProgressShimmer`) no Nível do Odômetro, Cobertura das Reservas, Meta Diária, Meta Semanal, Meta Personalizada, Desgaste da Moto e Participação por App.
  - **Gráficos (`.dashboard-chart-bar`)**: Animação de crescimento vertical escalonado (`animationDelay: idx * 75ms`) nas barras dos Últimos 7 Dias, com destaque visual no dia de pico e micro-interação no hover.

## Modo AllBlack Puro & Design Minimalista Global (Todas as Telas e Modais - 12/11/2026)
- **1. Modo AllBlack Puro Global (`#000000` / `bg-black` / `bg-transparent`)**:
  - Eliminados todos os fundos escuros azulados/cinzas antigos (`#12141C`, `#181B26`, `#090A0F`, `#0B0F19`, `bg-slate-900`, `bg-slate-950`, `bg-slate-800`) em todo o app:
    - `<meta name="theme-color" content="#000000" />` em `index.html`.
    - Barra de navegação inferior flutuante em `bg-black/95 border-neutral-800`.
    - `bgCanvas` (`bg-black`), `modalSurface` (`bg-black border-neutral-800`), `inputSurface` (`bg-black border-neutral-800`), `surfaceCard` e `surfaceSubtle` em `bg-transparent`.
    - Tooltips de gráficos (Recharts) atualizados para `bg-black border-neutral-800`.
    - Trilhas de barras de progresso e indicadores de neutralidade em `bg-neutral-800` (sem reflexo azulado de `slate-800`).
- **2. Refatoração Minimalista de `InvestimentosScreen.tsx`**:
  - Aplicado design minimalista AllBlack (`surfaceCard`/`surfaceSubtle` em `bg-transparent`, modais em `bg-black border-neutral-800`, botões sem fundo com bordas finas e números animados com `.dashboard-number-anim tabular-nums`).
  - Removido bloco JSX duplicado em `showInvestModal` que causava erro de compilação TypeScript, e ajustado contraste dos controles no modo claro.
- **3. Modais Secundários & Outras Abas (`Finanças`, `Moto`, `Histórico`, `Progresso`)**:
  - Todos os componentes modais (`AdjustBalanceModal.tsx`, `QuickCalculatorModal.tsx`, `ControleTurnoModal.tsx`, `MetaReversaModal.tsx`, `RadarCorridaModal.tsx`, `RelatorioMeiModal.tsx`) migrados para o tema AllBlack puro com sub-caixas transparentes, botões sem fundo e números animados.
  - Abas de **Finanças** (Despesas da Moto, Casa, Planejamento & IA, Sazonalidade, Ganhos, Gastos), **Histórico** e **Progresso** atualizadas com sub-cards transparentes (`bg-transparent border ${dividerBorder}`), animações `.dashboard-progress-fill` nas barras de progresso e `.dashboard-number-anim` nos valores principais.
- **4. Validação & APK Release**:
  - `npx tsc --noEmit`: 0 erros.
  - `npm run build`: build de produção Vite concluído com sucesso em 3.62s.
  - `npx cap sync android`: assets sincronizados com sucesso em 0.369s.
  - `.\gradlew.bat assembleRelease` (JDK 21): `BUILD SUCCESSFUL in 1m 16s`.
  - **APK Release (12/11/2026 18:35)**: `android/app/build/outputs/apk/release/app-release.apk` (4.567.081 bytes), verificado com `apksigner` (`Verified using v2 scheme: true`, 1 assinante).

## Melhorias na Tela de Moto (Manutenção Preventiva - 12/11/2026)
- **1. Duplicação de Cards de Manutenção**:
  - Criada função `duplicateMaintenanceCard(item)` em `src/App.tsx`.
  - Adicionado botão **Duplicar** (ícone `Copy`, estilo minimalista sem fundo) ao editar qualquer card de manutenção, gerando uma cópia independente com sufixo `(Cópia)` e abrindo-a diretamente para ajustes.
- **2. Modal Sobreposto de "Nova Manutenção" & Remoção do Card no Meio da Tela**:
  - Removido o bloco inline de criação de manutenção e o card tracejado `+ Adicionar Outra Manutenção` do meio da tela de Moto.
  - Clicar em **Nova Manutenção** no cabeçalho agora abre um modal centralizado sobre a tela (`isAddingNewMaint && maintDraft`), seguindo o mesmo padrão visual e comportamento do modal **Dados da Moto** (`modalSurface` em `bg-black` no AllBlack / `bg-white` no modo claro).
- **3. Bordas Minimalistas nos Cards de Alerta Preventivo**:
  - Removidas as bordas grossas (`border-l-[4px]`, `border-l-4`) e as animações/sombras pesadas (`maint-card-warn-glow`, `maint-card-danger-glow`) dos cards e banners de **Alerta Preventivo** e **Troca Obrigatória**, substituídas por bordas finas e suaves (`border-amber-500/30` e `border-rose-500/35` / `border-rose-500/45`).
- **4. Validação**:
  - `npx tsc --noEmit` (0 erros) e `npm run build` (3.90s) validados com sucesso (sem geração de APK conforme solicitado).

## Correção de Exclusão Permanente das Despesas da Moto e da Casa (12/11/2026)
- **Causa Raiz Identificada**:
  1. Diversos pontos em `src/App.tsx` (`loadDatabaseForUser`, `deleteBikeExpense`, `toggleBikeExpense`, `duplicateBikeExpense`, `saveBikeExpense`, `openEditBikeExpenseModal`, `toggleBikeExpensePaidStatus`, `financialIntelligence` e `toggleHouseholdExpensePaidStatus`/`duplicateHouseholdExpense`) verificavam `Array.isArray(list) && list.length > 0`, restaurando automaticamente `DEFAULT_BIKE_EXPENSES` / `DEFAULT_HOUSEHOLD_EXPENSES` sempre que o usuário excluía todas as despesas e a lista ficava vazia (`[]`).
  2. `LocalRoomDatabaseState` e `src/services/supabaseSync.ts` não registravam IDs excluídos dessas listas (`deletedBikeExpenseIds` / `deletedHouseholdExpenseIds`). Na sincronização (`downloadCloudDataToLocal`, `uploadLocalDataToCloud`, `combineSnapshotsList` e `runWorkManagerCloudSync`), itens padrão salvos anteriormente na nuvem eram re-mesclados ou sobrescreviam listas esvaziadas (`!isHouseholdListCustomized` / `!isBikeListCustomized`).
- **Solução Implementada**:
  1. **Rastreamento de Exclusões (`deletedBikeExpenseIds` & `deletedHouseholdExpenseIds`)**:
     - Adicionados os campos em `LocalRoomDatabaseState` (`src/services/supabaseSync.ts`), `createCleanDatabaseState` e `loadDatabaseForUser` (`src/App.tsx`).
     - `deleteBikeExpense` e `deleteHouseholdExpense` agora gravam o `id` removido em `deletedBikeExpenseIds` / `deletedHouseholdExpenseIds`; `saveBikeExpense` / `saveHouseholdExpense` e `resetDefaultBikeExpenses` / `resetDefaultHouseholdExpenses` limpam os IDs restaurados.
  2. **Remoção de Fallback por `length > 0` (`src/App.tsx`)**:
     - Substituído `Array.isArray(x) && x.length > 0` por `Array.isArray(x)` nos fluxos de leitura/edição/exclusão/cálculo, garantindo que listas esvaziadas (`[]`) permaneçam vazias em `localStorage` e na UI.
  3. **Merge e Proteção Anti-Sobrescrita na Nuvem (`src/services/supabaseSync.ts`)**:
     - `isExpenseConfigCustomized` (`isHouseholdListCustomized` / `isBikeListCustomized`) agora considera listas com `deletedIds.length > 0` como intencionalmente personalizadas mesmo quando vazias (`[]`).
     - `fetchCloudExpenseConfigLists`, `runWorkManagerCloudSync`, `fetchFromSupabase`, `combineSnapshotsList`, `uploadLocalDataToCloud` e `downloadCloudDataToLocal` propagam e filtram `deletedBikeExpenseIds` e `deletedHouseholdExpenseIds`, impedindo que despesas excluídas retornem após sincronização ou recarregamento.
- **Validação**:
  - `npx tsc --noEmit`: aprovado com 0 erros.
  - `npm run build`: build de produção Vite concluído (`dist/` gerado em 5.17s).
  - Teste automatizado (`verify_expense_deletion.ts` via `npx tsx` com mock de armazenamento e endpoints de nuvem): 6 de 6 cenários aprovados (exclusão parcial, exclusão total `[]`, persistência em `downloadCloudDataToLocal` / `uploadLocalDataToCloud` e sincronização para dispositivo novo). Sem geração de APK conforme solicitado.

## Sincronização de Faturamento Previsto & Débito Diário Automático por Diárias (12/11/2026)
- **1. Por que o Faturamento Previsto aparecia zerado apesar de existir no APK**:
  - **Causa Raiz Principal (`downloadCloudDataToLocal`)**: Em `src/services/supabaseSync.ts`, `downloadCloudDataToLocal` construía `mergedState` a partir de `...localState` sem mesclar nem copiar `remote.projectedRevenues`. Ao abrir o app no navegador/outro dispositivo, o `localState.projectedRevenues` (`[]`) prevalecia sobre os lançamentos salvos pelo APK na nuvem.
  - Além disso: `combineSnapshotsList` não mesclava `projectedRevenues` entre múltiplos snapshots; `uploadLocalDataToCloud` não mesclava com os itens da nuvem antes de enviar; `hasPopulatedData` não contabilizava `projectedRevenues`; `runWorkManagerCloudSync` não tinha proteção anti-sobrescrita quando um aparelho local ainda estava com `projectedRevenues` vazio sem exclusões explícitas (`deletedProjectedRevenueIds`); e `selectedMonthFinancials` / `availableFinanceMonths` em `src/App.tsx` filtravam exclusivamente por `p.date.startsWith(selectedFinanceMonth)` sem considerar intervalos (`startDate` -> `date`) nem exibir saldo pendente de outros meses.
- **2. Lançamentos Futuros por Dias Trabalhados + Diária Prevista e Débito Diário Automático**:
  - **Modelo (`ProjectedRevenueItem` & `computeProjectedRevenueBalance` em `src/services/supabaseSync.ts`)**:
    - Adicionados `startDate`, `workDays` e `dailyRate` ao item de faturamento previsto, além de `deletedProjectedRevenueIds` em `LocalRoomDatabaseState`.
    - Criada função pura `computeProjectedRevenueBalance(item, todayStr)`: quando o lançamento possui programação de diárias (`workDays` e `dailyRate`), cada dia que passa a partir de `startDate` rumo à `date` debita automaticamente 1 diária (`elapsedDays * dailyRate`) do total criado, atualizando o saldo futuro restante (`remainingAmount`) até zerar na data prevista final. Lançamentos avulsos legados sem programação diária mantêm o valor integral enquanto `pending`.
  - **Criação/Edição e Visualização (`src/App.tsx`)**:
    - Modal **Lançar / Editar Faturamento Futuro**: campos integrados para **Dias que irá trabalhar** (`1d` a `30d`), **Diária Prevista (R$/dia)** (com atalho **Média atual** calculada do histórico de corridas e botões rápidos), **Valor Total Previsto** (calculado automaticamente como `dias × diária`) e **Início da Contagem / Data Prevista Final**.
    - Aba **Faturamento Previsto** e **Resumo Mensal**: exibem o saldo futuro restante atualizado dia a dia, o valor total criado inicialmente, o total já debitado pelos dias decorridos, barra de progresso dos dias restantes, contagem em outros meses quando aplicável e conversão para ganho real usando o saldo restante (`bal.remainingAmount`).
- **3. Validação**:
  - `npx tsc --noEmit`: aprovado com 0 erros.
  - `npm run build`: build de produção Vite concluído (`dist/` gerado em 3.93s), sem geração de APK conforme solicitado.
  - Testes automatizados (`npx tsx`): `verify_projected_revenues.ts` (**5/5** cenários aprovados: progressão diária do débito de 5×R$ 200 até zerar, lançamento legado, download APK→Web, exclusão persistente com `deletedProjectedRevenueIds` e proteção anti-sobrescrita) e `verify_expense_deletion.ts` (**6/6** cenários aprovados).

## Seleção Livre de Dias no Calendário Minimalista para Faturamento Futuro (12/11/2026)
- **Objetivo**: Substituir os seletores antigos de dias/datas ("Dias que irá trabalhar", pílulas `1d..30d`, "Início da Contagem" e "Data Prevista Final") no lançamento de **Faturamento Futuro** por um **modal de calendário minimalista** no estilo do app, permitindo marcar/desmarcar livremente qualquer dia do mês (inclusive todos os dias do mês).
- **1. Persistência e Débito por Datas Selecionadas (`src/services/supabaseSync.ts`)**:
  - `ProjectedRevenueItem` e `ProjectedRevenueBalanceInfo` ganharam o campo opcional `selectedDates?: string[]` (`YYYY-MM-DD`).
  - `computeProjectedRevenueBalance(item, todayDateStr)` passou a reconhecer `selectedDates` ordenados, contabilizando `workDays = selectedDates.length` e debitando 1 diária (`dailyRate`) para cada dia selecionado que já passou (`d < today`). Lançamentos legados sem `selectedDates` continuam compatíveis.
- **2. Modal de Calendário Minimalista (`src/App.tsx`)**:
  - Removidos os estados e campos antigos (`projectedStartDate`, `projectedWorkDays`, `projectedDate` e pílulas `1d..30d`), substituídos por `showProjectedCalendarModal`, `projectedCalendarMonth` e `projectedSelectedDates`.
  - Dentro do modal de **Faturamento Futuro**, o motoboy clica em **Dias que irá rodar no mês** para abrir o modal minimalista de calendário (`showProjectedCalendarModal`), com navegação entre meses (`<` / `>`), atalho **Marcar Todos os Dias do Mês** / **Limpar**, grade de 7 colunas clicável dia a dia (incluindo destaque para o dia atual) e botão **Confirmar Dias**.
  - A filtragem por mês (`availableFinanceMonths`, `selectedMonthFinancials` e aba `projecao`) e o resumo dos cards passaram a refletir os `selectedDates` escolhidos, somando automaticamente `selectedDates.length × projectedDailyRate` no **Valor Total Previsto (R$)**.
- **3. Validação**:
  - `npx tsc --noEmit`: aprovado com 0 erros.
  - `npm run build`: build de produção Vite concluído (`dist/` gerado em 3.38s), sem geração de APK conforme solicitado.
  - Testes automatizados (`npx tsx`): `verify_projected_revenues.ts` (**5/5** cenários + subcenário `Test 1b` de datas não consecutivas via `selectedDates`) e `verify_expense_deletion.ts` (**6/6** cenários) aprovados (`Command exited with code 0`).

## Menu Cockpit no Botão Principal "Novo Registro" (12/11/2026)
- **Objetivo**: Substituir a abertura direta do modal único com duas abas no botão flutuante **Novo Registro** por um **Menu Cockpit** com animação suave de entrada/saída e 5 atalhos dedicados, onde cada botão abre seu respectivo modal específico.
- **1. Animações Suaves (`src/index.css`)**:
  - Adicionados os keyframes `cockpitBackdropIn`, `cockpitBackdropOut`, `cockpitPanelIn`, `cockpitPanelOut` e `cockpitItemStaggerIn`, com curvas `cubic-bezier(0.22, 1, 0.36, 1)` e entrada escalonada para cada botão do cockpit.
- **2. Menu Cockpit e Modais Dedicados (`src/App.tsx`)**:
  - Criado o estado `showQuickRegisterCockpit` (sem colidir com `showCockpitMenu` já usado no cabeçalho) junto de `isQuickRegisterClosing`, `openQuickRegisterCockpit` e `closeQuickRegisterCockpit`, com suporte à tecla `Escape`, clique no backdrop e transformação suave do botão **Novo Registro** (`+` rotacionando 45° para **Fechar**).
  - Atualizado `?action=novo_registro` para abrir o cockpit diretamente.
  - Os 5 botões do cockpit abrem cada um o seu modal dedicado:
    1. **Registrar Ganho** → `openNewEntryModal('ganho', true)` (modal focado em **Registrar Corrida**, sem as abas antigas).
    2. **Registrar Despesa** → `openNewEntryModal('gasto', true)` (modal focado em **Registrar Gasto**, sem as abas antigas).
    3. **Despesa da Moto** → `openNewBikeExpenseModal()` (modal **Nova Despesa da Moto**).
    4. **Despesa da Casa** → `openNewHouseholdExpenseModal()` (modal **Nova Despesa da Casa**).
    5. **Faturamento Previsto** → `openNewProjectedRevenueModal()` (modal **Lançar Faturamento Futuro** com o calendário minimalista).
  - Adicionado `isEntryModeDedicated` no modal de entrada para ocultar o seletor antigo `Ganho / Corrida | Gasto / Despesa` quando aberto diretamente para ganho ou despesa (e durante edições), aplicando `modalSurface` sólido e clique fora para fechar.
- **3. Validação**:
  - `npx tsc --noEmit`: aprovado com 0 erros.
  - `npm run build`: build de produção Vite concluído (`dist/` gerado em 2.99s), sem geração de APK conforme solicitado.
  - Testes automatizados (`npx tsx`): `verify_projected_revenues.ts` (**5/5**) e `verify_expense_deletion.ts` (**6/6**) aprovados (`Command exited with code 0`).

## Remoção do Cabeçalho/Card de Lançamento na Aba Faturamento Previsto (12/11/2026)
- **Alteração (`src/App.tsx`)**: Removido o bloco superior da sub-aba `billingSubTab === 'projecao'` que exibia o título `Faturamento Futuro Previsto & Projeção`, a tag `Corridas Agendadas, Metas & Fixos`, a descrição e o botão `+ Lançar Faturamento Previsto`, mantendo o restante da aba e os fluxos via Cockpit.
- **Validação**: `npx tsc --noEmit`, `npm run build` (`dist/` em 3.63s), `verify_projected_revenues.ts` (**5/5**) e `verify_expense_deletion.ts` (**6/6**) aprovados.

## Melhoria de Precisão e Latência do Motor GPS no Odômetro Automático (12/11/2026)
- **Problemas corrigidos**:
  - `src/App.tsx` arredondava `gpsDistanceKm` a `0.01 km` (10 m) a cada atualização do GPS, descartando deslocamentos curtos (< 5 m por tick) mesmo com a âncora avançando.
  - `src/services/gpsOdometerService.ts` usava cache de `2000ms`/`3000ms` e polling fixo lento (`8000ms`), aceitava leituras muito imprecisas (até `120 m`) capazes de envenenar a âncora inicial, e acumulava zigue-zague lateral / deriva parado sem filtragem preditiva.
  - Projeto Android não possuía serviço nativo em primeiro plano para manter leituras GNSS em 2º plano.
- **1. Motor Kalman 2D Preditivo + Porta Doppler (`src/services/gpsOdometerService.ts`)**:
  - Criada a classe pura `GpsOdometerEngine` em coordenadas planas ENU locais com filtro Kalman preditivo de velocidade constante (`kx, ky, vx, vy`), rejeitando picos (> 45 m), impedindo envenenamento por torre celular, recuperando após saída de túnel (3 confirmações seguidas sem somar salto fantasma) e zerando a velocidade após `4000ms` parado.
  - `watchPosition` configurado com `maximumAge: 0` (tempo real sem cache), fallback adaptativo apenas se o stream pausar `>= 2200ms`, além de catch-up imediato em `focus` e `visibilitychange`.
- **2. Precisão em Centímetros no Turno (`src/App.tsx`)**:
  - Acumulação em `activeShiftSession.gpsDistanceKm` alterada para precisão de `0.00001 km` (`Math.round(... * 100000) / 100000`), evitando perda de metros entre ticks.
- **3. Bridge Nativa Android em Primeiro Plano (`android/`)**:
  - Criados `GpsOdometerForegroundService.java` (GNSS `LocationManager.GPS_PROVIDER` a `500ms` / `0.5m` com o mesmo filtro Kalman 2D preditivo + notificação persistente e wake lock) e `NativeGpsOdometerPlugin.java` (sincronização monotônica sem dupla contagem), registrados em `MainActivity.java` com permissões `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION` e `WAKE_LOCK` em `AndroidManifest.xml`.
- **4. Validação**:
  - `npx tsc --noEmit`: 0 erros.
  - `npm run build`: `vite build` concluído em `4.25s` (sem gerar APK).
  - Testes automatizados (`npx tsx`): `verify_gps_odometer.ts` (**5/5** cenários: deriva parado, torre celular inicial, rota em L 1 km a 1 Hz, passos curtos de 4,5 m sem perda e recuperação pós-túnel/idle decay), `verify_projected_revenues.ts` (**5/5**) e `verify_expense_deletion.ts` (**6/6**).
  - Compilação Java Android (`.\gradlew.bat compileReleaseJavaWithJavac` com Adoptium JDK 21): `BUILD SUCCESSFUL in 1m 15s`.
  - **APK Release (12/11/2026 20:29)**: `npm run build` (`3.11s`), `npx cap sync android` (`2.1s`) e `.\gradlew.bat assembleRelease` (`BUILD SUCCESSFUL in 3m 1s`) -> `android/app/build/outputs/apk/release/app-release.apk` (`4.580.901` bytes / `4,37 MB`), assinado com `release-key.jks`.

## Saldo Líquido com Centavos no Painel e Botões Flutuantes Circulares (12/11/2026)
- **Saldo Líquido com Centavos (`src/App.tsx`)**:
  - Adicionado `fmtMoneyWithOptionalCents(v)` (linhas 1106–1116) que exibe exatamente 2 casas decimais (`R$ 1.250,45`) quando houver centavos (`Math.round(Math.abs(num) * 100) % 100 !== 0`) e 0 casas decimais para valores inteiros exatos (`R$ 1.250`).
  - Atualizado o destaque de `Saldo Atual do Motoboy` no Painel (`AnimatedNumber` de `curBalance`) para usar `fmtCurrencyExact` durante toda a animação quando `curBalance` possuir centavos (evitando saltos de layout no frame final) e `fmtMoney` quando inteiro, além de `fmtMoneyWithOptionalCents(Math.max(0, curBalance))` na legenda da barra de reserva logo abaixo.
- **Botões Flutuantes Circulares (`src/App.tsx`)**:
  - Removidos os rótulos de texto (`Voz` / `Ouvindo...` e `Novo Registro` / `Fechar`) dos dois botões flutuantes no canto inferior direito.
  - Convertidos os dois botões (Ditar por Voz e `+` / Cockpit de Registros) para botões circulares simétricos (`w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full flex items-center justify-center shrink-0`), mantendo o ícone `<Mic />` e o ícone `<Plus />` (com rotação suave `rotate-45` ao abrir).
- **Validação e APK Release**:
  - `npx tsc --noEmit`: 0 erros.
  - `npm run build`: `dist/` gerado em `5.42s`.
  - Testes automatizados (`npx tsx` / `node`): `verify_gps_odometer.ts` (**5/5**), `verify_projected_revenues.ts` (**5/5**), `verify_expense_deletion.ts` (**6/6**) e verificação de `fmtMoneyWithOptionalCents` (**8/8** cenários).
  - `npx cap sync android` (`3.267s`) + `.\gradlew.bat assembleRelease` (Adoptium JDK 21): `BUILD SUCCESSFUL in 2m` -> `android/app/build/outputs/apk/release/app-release.apk` (`4.580.965` bytes, `12/11/2026 21:48:39`), assinado com `release-key.jks`.
