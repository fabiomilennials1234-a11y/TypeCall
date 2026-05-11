---
title: "ADR-006: Asset storage em filesystem com static handler"
tags: [adr, architecture, storage]
status: accepted
created: 2026-05-07
id: ADR-006
---

# ADR-006: Asset Storage em Filesystem com Static Handler

## Contexto

Feature de Form Theming permite usuarios fazer upload de imagens de fundo. Volume estimado: dezenas a centenas de imagens por org, ate 5MB cada. Total de armazenamento esperado: <50GB no MVP.

Decisao tecnica: onde guardar arquivos? S3 (object storage), Postgres bytea, ou filesystem local?

## Decisao

**Filesystem local** sob `data/uploads/{org_id}/{uuid}.{ext}`, servido por:

- **Dev**: handler estatico Go montado em `/uploads/*` via `http.FileServer(http.Dir("data/uploads"))`.
- **Prod**: nginx serve `/uploads/*` diretamente do volume Docker montado em `/var/lib/typecall/uploads`. Bypass do Go pra performance.

Tabela `form_assets` rastreia metadata (id, form_id, organization_id, storage_path, url, mime_type, size, dimensions, created_at) com RLS por org.

## Justificativa

**Por que NAO S3 (ainda)**:
- AWS conta + IAM + presigned URLs adicionam ~3 dias de complexidade
- ~$0.023/GB/mes — irrelevante no volume MVP, mas desproporcional vs simplicidade
- VPS Hostinger ja tem 100GB SSD ocioso — usar
- Migrar pra S3 depois e aditivo (escrever Storage interface, plugar dois drivers)

**Por que NAO Postgres bytea**:
- Bloat no banco; backups crescem linear com uploads
- Servir bytea via API forca bottleneck Go pra cada request
- Pattern anti-cache (CDN nao cacheia bytea responses tao bem)

**Filesystem ganha em**:
- Implementacao trivial (50 LOC Go)
- nginx serve em microssegundos com sendfile
- Backup direto via tar/rsync do volume
- Migracao pra S3 quando precisar e plugavel

## Consequencias

**Positivas**:
- Zero custo extra de infra
- Performance excelente (nginx + sendfile)
- Backup simples (snapshot do volume)
- RLS atomica via tabela form_assets — sem dois sistemas de auth

**Negativas**:
- VPS unica = single point of failure pra arquivos. Mitigar com backup diario do volume.
- Sem CDN — latencia geografica pode subir conforme usuarios fora do BR. Aceitavel ate 1k+ usuarios.
- Migracao pra S3 quando volume crescer exige reupload + atualizar URLs no DB.

**Constraints aplicadas**:
- Cap de 5MB por upload (form de hero image, nao mosaico)
- Mime types restritos: image/jpeg, image/png, image/webp, image/gif
- Path UUID em diretorio por org_id pra isolamento + facilita backup tenant-aware

## Migracao futura

Quando precisar de CDN/multi-region:

1. Definir interface `AssetStorage` (Upload, Delete, URL)
2. Implementacoes: `FilesystemStorage` (atual) e `S3Storage`
3. Swap via env var `ASSET_STORAGE_DRIVER`
4. Backfill: script copia arquivos do disk pra S3, atualiza url no DB
5. Sem mudanca de schema

## Referencias

- ADR-001 — backend Go nao Supabase (mesma filosofia: simplicidade > prematura)
- [[Fase 6 - Advanced]] — secao Form Theming
