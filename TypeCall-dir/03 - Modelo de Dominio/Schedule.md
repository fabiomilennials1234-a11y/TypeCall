---
tags:
  - dominio
  - schedule
status: vivo
created: 2026-05-05
---

# Schedule

O modulo de agendamento — a metade "Calendly" do TypeCall.

---

## Entidade: EventType

Template de agendamento. Define as regras de como e quando reunioes podem ser marcadas.

| Campo | Tipo | Descricao |
|---|---|---|
| `id` | UUID v7 | PK. |
| `organization_id` | UUID | FK → organizations. |
| `created_by` | UUID | FK → users. |
| `name` | TEXT | Nome exibido pro respondente. Ex: "Reuniao de Demonstracao". |
| `slug` | TEXT | Unico por org. |
| `description` | TEXT | Descricao opcional. |
| `duration_minutes` | INT | Duracao da reuniao. Default: 30. |
| `buffer_before` | INT | Minutos de buffer antes da reuniao. Default: 0. |
| `buffer_after` | INT | Minutos de buffer depois da reuniao. Default: 15. |
| `min_notice_hours` | INT | Antecedencia minima pra agendar. Default: 2. |
| `max_advance_days` | INT | Maximo de dias no futuro. Default: 30. |
| `max_per_day` | INT | Maximo de reunioes por dia. NULL = sem limite. |
| `location_type` | ENUM | `google_meet`, `zoom`, `phone`, `in_person`, `custom`. |
| `location_value` | TEXT | URL ou endereco (quando `custom` ou `in_person`). |
| `color` | TEXT | Cor no calendario. |
| `is_active` | BOOLEAN | Default: true. |
| `settings` | JSONB | Configuracoes adicionais. |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## Entidade: AvailabilityRule

Horario semanal recorrente de um usuario.

| Campo | Tipo | Descricao |
|---|---|---|
| `id` | UUID v7 | PK. |
| `user_id` | UUID | FK → users. |
| `event_type_id` | UUID | FK → event_types. NULL = regra global do usuario. |
| `day_of_week` | INT | 0 (domingo) a 6 (sabado). |
| `start_time` | TIME | Horario de inicio (no timezone do usuario). |
| `end_time` | TIME | Horario de fim. |
| `timezone` | TEXT | IANA timezone. Ex: `America/Sao_Paulo`. |

**Exemplo:** "Segunda a sexta, 9h as 18h, horario de Brasilia."

```sql
-- 5 rows:
(user_id, NULL, 1, '09:00', '18:00', 'America/Sao_Paulo')  -- segunda
(user_id, NULL, 2, '09:00', '18:00', 'America/Sao_Paulo')  -- terca
(user_id, NULL, 3, '09:00', '18:00', 'America/Sao_Paulo')  -- quarta
(user_id, NULL, 4, '09:00', '18:00', 'America/Sao_Paulo')  -- quinta
(user_id, NULL, 5, '09:00', '18:00', 'America/Sao_Paulo')  -- sexta
```

---

## Entidade: AvailabilityOverride

Excecoes por data especifica. Sobrescrevem as rules pra aquele dia.

| Campo | Tipo | Descricao |
|---|---|---|
| `id` | UUID v7 | PK. |
| `user_id` | UUID | FK → users. |
| `date` | DATE | Data especifica da excecao. |
| `start_time` | TIME | NULL = dia inteiro bloqueado. |
| `end_time` | TIME | NULL = dia inteiro bloqueado. |
| `reason` | TEXT | Motivo opcional. Ex: "Feriado", "Ferias". |

**Exemplo:** "15 de novembro — Proclamacao da Republica — dia bloqueado."

```sql
(user_id, '2026-11-15', NULL, NULL, 'Proclamacao da Republica')
```

**Exemplo:** "Sexta-feira so atendo de manha."

```sql
(user_id, '2026-05-08', '09:00', '12:00', 'Meio periodo')
```

---

## Algoritmo de Calculo de Availability

Dado um `event_type_id` e um range de datas, calcular slots disponiveis.

### Passo 1: Resolver hosts

```
Se event_type tem round-robin pool:
  hosts = todos usuarios do pool
Senao:
  hosts = [event_type.created_by]
```

### Passo 2: Gerar janelas de disponibilidade

```
Para cada host:
  Para cada dia no range:
    1. Buscar AvailabilityRules do host pro day_of_week
    2. Verificar se existe AvailabilityOverride pro date
       - Se override com times → usar override
       - Se override sem times (bloqueio) → pular dia
       - Se sem override → usar rules
    3. Converter janelas pra UTC
```

### Passo 3: Buscar conflitos de calendario

```
Para cada host:
  Chamar Google Calendar freeBusy API pro range
  (com cache Redis de 15min — ver Passo 7)
  Resultado: lista de busy periods [start, end]
```

### Passo 4: Subtrair conflitos

```
Para cada janela de disponibilidade:
  Subtrair todos busy periods do calendario
  Subtrair todos bookings existentes do TypeCall
  Resultado: janelas livres
```

### Passo 5: Fatiar em slots

```
Para cada janela livre:
  Gerar slots de duracao = event_type.duration_minutes
  Aplicar buffer_before e buffer_after entre slots
  Filtrar: remover slots com start < now + min_notice_hours
  Filtrar: remover slots com start > now + max_advance_days
```

### Passo 6: Aplicar limites

```
Para cada dia:
  Se count(bookings do dia) >= max_per_day → remover todos slots do dia
```

### Passo 7: Cache e invalidacao

```
freeBusy cache (Redis):
  Key: freeBusy:{user_id}:{date}
  TTL: 15 minutos
  Invalidacao proativa: Google Calendar watch channels
    → webhook recebido → invalidar cache do usuario
```

**Resultado final:** lista de slots `{ start: DateTime, end: DateTime, host_id: UUID }`.

---

## Calendar Sync

### Modelo hibrido: polling + push

| Mecanismo | Quando | Pra que |
|---|---|---|
| **freeBusy polling** | A cada request de availability | Dados frescos de ocupacao. Cache 15min no Redis. |
| **watch channels (push)** | Sempre ativo por usuario conectado | Google notifica mudancas no calendario → invalida cache → proximo request pega dados frescos. |
| **full sync (fallback)** | A cada 6h ou quando watch channel expira | Garante consistencia caso push falhe. |

### Watch Channel Lifecycle

```
1. Usuario conecta Google Calendar (OAuth)
2. Backend cria watch channel via Calendar API
3. Google envia notificacoes pra webhook endpoint
4. Webhook recebe → invalida cache Redis do usuario
5. Watch expira (7 dias default) → job renova automaticamente
```

---

## Timezone Invariant

> **Tudo UTC no banco. Conversao na fronteira da aplicacao.**

- `AvailabilityRule.start_time` / `end_time` sao no timezone do usuario pra facilitar edicao.
- Na hora de calcular availability, converte pra UTC imediatamente.
- Booking timestamps: sempre UTC.
- API retorna UTC. Frontend converte pro timezone do usuario (host) ou respondente.
- Redis cache keys incluem a data em UTC.

---

## Links

- [[03 - Modelo de Dominio/Booking|Booking]]
- [[03 - Modelo de Dominio/Flow|Flow]]
- [[01 - Produto/Glossario|Glossario]]
- [[00 - Indice|Voltar ao Indice]]
