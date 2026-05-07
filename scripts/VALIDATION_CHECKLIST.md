# TypeCall — Validation Checklist (Sprint 10)

## Setup

```bash
# 1. Start infra
docker-compose up -d postgres redis

# 2. Start API (with auto-migration)
cd apps/api && go run ./cmd/api

# 3. Start frontend
cd apps/web && pnpm dev

# 4. Seed demo data
bash scripts/seed.sh

# 5. Run smoke test
bash scripts/smoke-test.sh
```

## Manual Validation

### Auth
- [ ] Register: criar conta nova em /register
- [ ] Login: entrar com admin@milennials.com / milennials2026
- [ ] Me: sidebar mostra nome + org
- [ ] Logout: sair e ser redirecionado pra /login
- [ ] Refresh: ficar logado apos 15min (auto-refresh)
- [ ] Protected routes: acessar /forms sem login redireciona pra /login

### Forms
- [ ] Listagem: 3 forms aparecem (2 published, 1 draft)
- [ ] Criar form: botao "Novo formulario" abre dialog
- [ ] Detalhe: clicar num form mostra info + status badge
- [ ] Builder: editar form, arrastar blocos, salvar draft
- [ ] Publicar: publicar form e ver versao incrementar
- [ ] Deletar: soft delete funciona
- [ ] Link publico: /f/{slug} acessivel sem login

### Form Runner
- [ ] /f/qualificacao-de-leads carrega
- [ ] Progress bar avanca com cada step
- [ ] Welcome screen mostra titulo + descricao
- [ ] Short text: digitar e apertar Enter avanca
- [ ] Email: validacao funciona
- [ ] Long text: textarea funcional
- [ ] Ending screen com mensagem customizada
- [ ] Submit: resposta criada com sucesso
- [ ] Voltar: botao de voltar funciona entre steps
- [ ] Mobile (375px): layout responsivo, touch funcional

### Responses
- [ ] Listagem: 5+ respostas aparecem com status badge
- [ ] Detalhe: clicar mostra todas answers da resposta
- [ ] Nome/email do respondente exibido

### Scheduling
- [ ] Event types: 2 tipos aparecem (Demo 30min, Consultoria 60min)
- [ ] Detalhe: config editavel (duracao, buffers, notice)
- [ ] Availability: regras semanais exibidas, editaveis
- [ ] Overrides: criar override pra data especifica

### Public Booking
- [ ] /f/{slug-com-schedule-step}: step de agendamento inline (se existir)
- [ ] Slots: dias com disponibilidade mostram horarios
- [ ] Booking: selecionar slot → preencher nome/email → confirmar
- [ ] Conflito: tentar bookar mesmo slot → erro

### Bookings Admin
- [ ] Listagem: bookings aparecem com status
- [ ] Cancelar: cancelar booking muda status

### Analytics
- [ ] Selecionar form: metricas carregam
- [ ] Summary cards: views, starts, completions, taxa
- [ ] Daily chart: barras de views por dia
- [ ] Drop-off: funil mostra % de abandono por step
- [ ] Export CSV: download funciona

### Webhooks
- [ ] Config: pagina mostra estado vazio ou config existente
- [ ] Criar: configurar URL + secret
- [ ] Deliveries: lista de entregas (se webhook configurado)

### Embed
- [ ] Embed page: gerar codigo de embed
- [ ] 4 modos: inline, popup, slider, fullpage
- [ ] Copiar codigo: snippet copiado pro clipboard

### Error States
- [ ] Pagina que nao existe: NotFoundPage renderiza
- [ ] API offline: error state renderiza (nao tela branca)
- [ ] Form nao encontrado: mensagem clara em PT-BR

### Cross-cutting
- [ ] Dark mode: default, todas as paginas consistentes
- [ ] PT-BR: nenhum texto em ingles na UI (exceto termos tecnicos)
- [ ] Mobile 375px: sidebar colapsa, conteudo legivel
- [ ] Loading states: spinner em toda pagina que carrega dados
- [ ] Empty states: mensagem + CTA quando lista vazia
