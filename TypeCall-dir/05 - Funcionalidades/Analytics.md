---
title: Analytics
tags: [funcionalidades, analytics]
created: 2026-05-05
status: active
---

# Analytics

Sistema de analytics do TypeCall para medir performance de formularios, identificar pontos de abandono e atribuir conversoes. Projetado para dar visibilidade completa do funil qualify-to-book.

## Response Events

Cada interacao do respondente gera um evento rastreavel. Eventos sao a base de todas as metricas.

| Evento | Descricao | Momento |
|--------|-----------|---------|
| `view` | Formulario carregado no browser | Iframe/pagina renderizou |
| `start` | Respondente iniciou o preenchimento | Clicou "Comecar" no welcome screen |
| `question_seen` | Pergunta foi exibida ao respondente | Step renderizado no runner |
| `question_answered` | Respondente respondeu uma pergunta | Resposta submetida e validada |
| `booking_slot_selected` | Respondente selecionou um horario no calendario | Slot clicado no step schedule |
| `submit` | Formulario completado com sucesso | Ultimo step submetido |
| `abandon` | Respondente abandonou o formulario | Inatividade > 30min ou fechou a pagina (beforeunload) |
| `share` | Link do formulario compartilhado | Clicou em botao de compartilhar no ending |

- **Armazenamento**: tabela `response_events` com `event_type`, `response_id`, `step_id`, `timestamp`, `metadata`
- **Ingestion**: eventos enviados via `POST /api/v1/events` com batching (ate 10 eventos por request)
- **Deduplicacao**: `event_id` unico (UUID client-side) previne duplicatas em retries

## Key Metrics

Metricas calculadas a partir dos response events.

| Metrica | Formula | Importancia |
|---------|---------|-------------|
| **View-to-start rate** | `starts / views * 100` | Mede atratividade do welcome screen e qualidade do trafego |
| **Question drop-off rate** | `(seen - answered) / seen * 100` por step | Identifica perguntas problematicas que causam abandono |
| **Completion rate** | `submits / starts * 100` | KPI principal — eficacia geral do formulario |
| **Booking conversion rate** | `bookings / submits * 100` | Especifico da fusion — taxa de agendamento entre quem completa |
| **Avg completion time** | `media(submit_time - start_time)` | Indica complexidade percebida do formulario |

- **Filtros**: por periodo, source (UTM), device, timezone
- **Comparacao**: metricas comparaveis entre periodos (semana atual vs anterior)

## Drop-off Analysis

Analise detalhada de onde os respondentes abandonam o formulario.

- **Per-question drop-off**: taxa de abandono por pergunta — identifica exatamente qual step causa mais perda
- **Funnel visualization**: grafico de funil mostrando a progressao step a step, com percentuais de conversao entre cada etapa
- **Heatmap temporal**: horarios do dia e dias da semana com maior abandono
- **Insights automaticos**: destaque automatico do step com maior drop-off, comparacao com benchmarks do account

### Acoes sugeridas

O dashboard sugere acoes baseadas nos dados:
- Step com > 40% drop-off: "Considere simplificar ou remover esta pergunta"
- Formulario com > 15 perguntas e completion < 30%: "Formulario longo — considere reduzir"
- Drop-off alto no step schedule: "Verifique disponibilidade de horarios"

## Source Tracking

Rastreamento de origem do trafego para atribuicao de conversoes.

- **UTM params**: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` capturados automaticamente da URL
- **Referrer**: `document.referrer` capturado no primeiro load
- **Filtro por source**: dashboard filtravel por qualquer combinacao de UTM params
- **Breakdown**: metricas desagregadas por source (ex: completion rate do Google Ads vs organic)
- **Persistencia**: UTM params armazenados no `response_event` de `view` e propagados para toda a session

## Materialized Views

Views materializadas para performance de queries em dashboards.

### `form_daily_metrics`

Agregacao diaria pre-calculada por formulario.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `form_id` | UUID | Referencia ao formulario |
| `date` | DATE | Dia da metrica |
| `views` | INTEGER | Total de views no dia |
| `starts` | INTEGER | Total de starts no dia |
| `completions` | INTEGER | Total de submits no dia |
| `abandons` | INTEGER | Total de abandons no dia |
| `bookings` | INTEGER | Total de bookings criados no dia |
| `avg_completion_seconds` | FLOAT | Tempo medio de conclusao em segundos |

- **Refresh**: atualizada via cron job a cada hora (ou on-demand via API)
- **Retencao**: dados mantidos por 2 anos
- **Indice**: `(form_id, date)` — queries de dashboard retornam em < 50ms

## Real-time Dashboard (v2.0)

Dashboard com atualizacao em tempo real para acompanhar formularios ao vivo.

- **WebSocket**: conexao persistente que recebe eventos conforme respondentes interagem
- **Live feed**: lista de respostas chegando em tempo real com nome, source, progresso
- **Metricas ao vivo**: contadores animados de views, starts, completions atualizando em real-time
- **Uso**: ideal para acompanhar campanhas recem-lancadas ou eventos ao vivo

## Conversion Attribution (v2.0)

Atribuicao de receita gerada por formularios ao CRM.

- **Form → Deal**: tracking de qual formulario TypeCall gerou qual deal no [[Torque CRM Integration]]
- **Revenue attribution**: valor do deal atribuido ao formulario de origem
- **Pipeline view**: visualizacao de quantos leads de cada formulario estao em cada stage do pipeline
- **ROI**: se UTM params incluem custo da campanha, calcular ROI por formulario/source

## A/B Testing (v2.0)

Testes de variantes de formularios para otimizacao de conversao.

- **Variantes**: criar versoes alternativas do mesmo formulario (ordem de perguntas, copy, numero de perguntas)
- **Traffic splitting**: distribuicao configuravel de trafego entre variantes (ex: 50/50, 70/30)
- **Metricas comparativas**: completion rate, booking rate, avg time comparados entre variantes
- **Statistical significance**: calculo automatico de significancia estatistica (95% confidence interval)
- **Winner selection**: destaque automatico da variante vencedora quando significancia atingida

## Relacionamentos

- [[Form Engine]] — fonte dos response events
- [[Fusion Layer]] — metricas especificas do fluxo fusionado
- [[Torque CRM Integration]] — conversion attribution via CRM data
- [[Fase 5 - Analytics e Webhooks]] — feature phase de implementacao
