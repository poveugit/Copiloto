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
