---
title: Form Engine
tags: [funcionalidades, form-engine]
created: 2026-05-05
status: active
---

# Form Engine

O Form Engine e o nucleo do TypeCall — responsavel por renderizar formularios conversacionais, construir formularios visualmente e processar respostas. Combina a experiencia de preenchimento do Typeform com um builder visual poderoso.

## Conversational Renderer

O renderer exibe **uma pergunta por vez**, criando uma experiencia conversacional focada que maximiza taxas de conclusao.

- **Mobile-first**: layout responsivo com touch targets generosos, teclado virtual otimizado por tipo de campo
- **Animacoes**: transicoes suaves entre steps (slide + fade), micro-interacoes em selecao de opcoes, feedback visual imediato em validacao
- **Progress indicator**: barra de progresso contextual que reflete posicao no fluxo (considera branching)
- **Keyboard navigation**: Enter avanca, Shift+Enter quebra linha em long_text, atalhos numericos para multiple_choice
- **Acessibilidade**: ARIA labels, focus management, suporte a screen readers

## Question Types

Lista completa dos tipos de pergunta suportados pelo engine:

| Tipo | Descricao |
|------|-----------|
| `short_text` | Campo de texto curto, single-line. Ideal para nome, cargo, empresa. Suporta placeholder e maxLength. |
| `long_text` | Campo de texto longo, multi-line com auto-resize. Para descricoes, contexto, feedback aberto. |
| `email` | Input com validacao de formato email nativa. Auto-complete do browser. Usado para captura de contato. |
| `phone` | Input com mascara de telefone BR (+55), aceita celular e fixo. Validacao de formato e quantidade de digitos. |
| `number` | Input numerico com min/max/step opcionais. Suporta formatacao de moeda (BRL) e percentual. |
| `url` | Input com validacao de URL. Auto-prepend `https://` se omitido. Para site, LinkedIn, portfolio. |
| `multiple_choice` | Selecao unica entre opcoes pre-definidas. Layout em cards clicaveis. Suporta "Outro" com campo aberto. Cada opcao pode ter um `score` para qualificacao. |
| `checkboxes` | Selecao multipla. Min/max selecoes configuraveis. Layout similar ao multiple_choice. |
| `dropdown` | Select com busca/filtro para listas longas (cidades, industrias). Usa Combobox pattern. |
| `picture_choice` | Selecao visual com imagens — ideal para escolha de produto, estilo, plano. Grid responsivo. |
| `rating` | Escala de 1-5 ou 1-10 com icones customizaveis (estrelas, coracoes, emojis). |
| `nps` | Net Promoter Score: escala 0-10 com labels "Nada provavel" / "Muito provavel". Calculo automatico de promoters/detractors/passives. |
| `opinion_scale` | Escala numerica configuravel (1-5, 1-7, 1-10) com labels nos extremos. Para pesquisas de satisfacao. |
| `date` | Date picker com calendario visual. Suporta restricao de range (min/max date), desabilitar fins de semana. |
| `file_upload` | Upload de arquivo com drag-and-drop. Tipos aceitos e tamanho maximo configuraveis. Upload direto pra S3 via presigned URL. |
| `statement` | Tela informativa sem input — usada para introducoes entre secoes, explicacoes, termos. Suporta Markdown. |
| `welcome` | Tela inicial do formulario com titulo, descricao, imagem/video e botao de inicio. Sempre o primeiro step. |
| `ending` | Tela final pos-submit. Customizavel com mensagem de agradecimento, redirect URL, botoes de acao (CTA). |
| `schedule` | **Fusion step** — exibe o [[Scheduling Engine]] inline dentro do fluxo. Referencia um `event_type_id` e mostra calendario de disponibilidade. Ver [[Fusion Layer]]. |
| `payment` | Step de pagamento via PIX (QR code), cartao de credito ou boleto. Integra com [[Asaas Payments]]. Libera proximo step apos confirmacao via webhook. |

## Form Builder

Editor visual drag-and-drop para construcao de formularios.

### Arquitetura do Builder

- **@dnd-kit**: biblioteca de drag-and-drop acessivel e performatica para React
- **Canvas central**: lista ordenada de steps, reordenavel por drag
- **Paleta de blocos**: sidebar esquerda com todos os question types agrupados por categoria (Texto, Escolha, Contato, Midia, Especial)
- **Painel de propriedades**: sidebar direita contextual — exibe configuracoes do step selecionado (label, placeholder, required, validacao, logica condicional, score)
- **Live preview**: preview em tempo real do form no modo conversacional, atualiza a cada mudanca

### Workflow do Builder

1. Arrastar bloco da paleta para o canvas
2. Clicar no bloco para editar propriedades
3. Configurar validacao e logica condicional
4. Preview ao vivo no painel lateral
5. Salvar (auto-save) ou publicar

## Response Variables

O sistema de variaveis permite personalizar perguntas subsequentes com base em respostas anteriores.

- Sintaxe: `{{answer_slug}}` — onde `slug` e o identificador unico do step
- Exemplo: "Obrigado, **{{nome}}**! Agora me conta sobre a **{{empresa}}**..."
- Resolucao: no momento da renderizacao, o runner substitui variaveis pelos valores ja respondidos
- Fallback: se a variavel nao tem resposta (step pulado por branching), exibe string vazia ou fallback configurado
- Escopo: variaveis disponiveis apenas dentro da mesma response session

## Validation

Validacao por step, executada antes de permitir avanco para a proxima pergunta.

| Regra | Descricao |
|-------|-----------|
| `required` | Campo obrigatorio — nao permite avancar sem resposta |
| `minLength` | Comprimento minimo do texto (short_text, long_text) |
| `maxLength` | Comprimento maximo do texto |
| `pattern` | Regex pre-definido (ex: CPF, CNPJ, CEP) |
| `custom_regex` | Regex customizado definido pelo criador do form |
| `min` / `max` | Valores numericos minimo/maximo (number, rating) |
| `min_selections` / `max_selections` | Quantidade de selecoes em checkboxes |

- Validacao client-side: feedback instantaneo no runner
- Validacao server-side: re-validacao na API de ingestion (nunca confiar apenas no client)
- Mensagens de erro: customizaveis por step, default em PT-BR

## Auto-save

Drafts sao salvos automaticamente para evitar perda de trabalho no builder.

- **Frequencia**: a cada 5 segundos apos ultima alteracao (debounced)
- **Metodo**: `PATCH /api/v1/forms/{id}/draft` com delta das mudancas
- **Indicador**: status visual no header do builder ("Salvo", "Salvando...", "Erro ao salvar")
- **Conflito**: se outro usuario editou, exibe alerta com opcao de recarregar
- **Recovery**: ao reabrir o builder, carrega ultimo draft automaticamente

## Publishing

Publicacao cria uma nova versao imutavel do formulario.

- **form_version**: cada publish gera um novo registro em `form_versions` com snapshot completo do `FlowDefinition` (JSONB) — ver [[ADR-002-flow-definition-jsonb]]
- **Imutabilidade**: versoes publicadas nunca sao alteradas. Respostas referenciam a versao em que foram coletadas.
- **Rollback**: possivel reativar versao anterior
- **Draft vs Published**: builder sempre edita o draft. Publish promove draft para versao ativa.
- **Link publico**: `typecall.com.br/f/{slug}` sempre serve a versao ativa mais recente
- **Mid-session**: respondentes que iniciaram com versao N continuam na versao N mesmo apos novo publish

## Relacionamentos

- [[Scheduling Engine]] — step `schedule` integra calendario inline
- [[Fusion Layer]] — orquestracao entre form e scheduling
- [[Analytics]] — eventos de resposta alimentam metricas
- [[ADR-002-flow-definition-jsonb]] — decisao de armazenamento do flow
- [[Fase 2 - Form Builder]] — feature phase de implementacao
