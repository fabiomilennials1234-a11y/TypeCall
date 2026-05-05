---
title: "ADR-003: Embed via iframe, nao Web Component"
tags: [adr, architecture]
status: accepted
created: 2026-05-05
id: ADR-003
---

# ADR-003: Embed via iframe, nao Web Component

## Contexto

O TypeCall precisa ser embedavel em sites de terceiros — blogs, landing pages, sites institucionais, e-commerces. A experiencia de embed precisa ser:

- **Isolada**: CSS e JS do form nao podem interferir no site host e vice-versa
- **Segura**: nenhum acesso ao DOM do host, cookies ou localStorage do host
- **Consistente**: mesma aparencia independente do site host
- **Leve**: impacto minimo na performance do site host
- **Compativel**: funcionar em qualquer site, independente de framework, CSP ou stack

## Decisao

**Embed via iframe** com um JS SDK (loader.js) como ponte de comunicacao via postMessage.

Arquitetura:

```
Site Host                          TypeCall
┌─────────────────┐               ┌─────────────────┐
│                  │               │                  │
│  loader.js       │  postMessage  │  responder app   │
│  (< 3KB gz)     │ ←──────────→  │  (< 50KB gz)    │
│                  │               │                  │
│  cria <iframe>   │               │  embed.typecall  │
│  escuta eventos  │               │  .com.br/f/{slug}│
│                  │               │                  │
└─────────────────┘               └─────────────────┘
```

## Alternativas Consideradas

### Web Component (rejeitado)

Criar um `<typecall-form>` custom element com Shadow DOM.

Problemas:
- **Shadow DOM impede customizacao**: Shadow DOM isola styles, mas tambem impede heranca de fontes do site host. `font-family` do host nao propaga para dentro do Shadow DOM sem `::part()` ou `adoptedStyleSheets`, ambos com suporte inconsistente.
- **CSS leaking**: apesar do Shadow DOM, alguns styles globais (box-sizing, line-height normalizations) vazam para dentro ou para fora, causando inconsistencias visuais.
- **JavaScript nao isolado**: Web Components compartilham o mesmo escopo JS do host. Um erro no form pode afetar o site e vice-versa. Global event listeners (scroll, resize, keydown) podem conflitar.
- **Bundle size no host**: o codigo React do runner seria carregado no contexto do host page, aumentando o bundle do site. Com iframe, o codigo vive em dominio separado.
- **CSP issues**: sites com Content-Security-Policy restritivo podem bloquear inline scripts e dynamic imports necessarios pelo Web Component.

### Direct DOM Injection (rejeitado)

Injetar HTML/CSS/JS diretamente no DOM do host page.

Problemas:
- **Conflito CSS catastrofico**: styles do host afetam o form e styles do form afetam o host. Nenhum isolamento. CSS modules/scoped CSS mitigam parcialmente, mas nao resolvem.
- **Conflito JS**: event listeners globais, prototipos modificados (polyfills do host), versoes conflitantes de React ou outras libs.
- **CSP**: praticamente impossivel funcionar em sites com CSP restritivo.
- **Manutencao**: qualquer mudanca no runner pode quebrar sites de terceiros de formas imprevisiveis.

## Razoes da Decisao

1. **Isolamento sandbox**: iframe cria um contexto de navegacao completamente separado. CSS, JS, cookies, localStorage — tudo isolado. Impossivel conflitar com o site host.

2. **CSP safety**: iframe com `src` para dominio externo funciona na grande maioria das configuracoes CSP. O site host so precisa permitir `frame-src: embed.typecall.com.br`.

3. **Style isolation**: o form renderiza exatamente igual em qualquer site. Nenhum style do host interfere. Customizacao controlada via theme passado por postMessage.

4. **Pattern provado**: Typeform e Calendly — os dois produtos que o TypeCall fusiona — usam exatamente este pattern. E o padrao da industria para embeds de formularios e agendamento.

5. **Security**: iframe com `sandbox` attribute pode restringir capacidades (scripts, forms, popups). O site host nao tem acesso ao conteudo do iframe (same-origin policy).

6. **Performance do host**: loader.js (< 3KB) e o unico impacto no bundle do host. Todo o peso do runner fica no iframe, carregado do dominio TypeCall.

## Consequencias

### Positivas

- Isolamento total (CSS, JS, security)
- Funciona em qualquer site sem conflito
- CSP-friendly
- Pattern familiar para desenvolvedores
- Independencia de deploy (atualizar runner sem afetar sites host)

### Negativas

- **Comunicacao limitada**: toda interacao host ↔ form passa por postMessage (assincrono, serializado). Nao ha acesso direto ao estado do form.
- **SEO**: conteudo dentro do iframe nao e indexado por search engines. Mitigacao: nao relevante para forms de qualificacao (nao precisa de SEO).
- **Auto-resize complexo**: iframe nao ajusta altura automaticamente. Precisa de `ResizeObserver` dentro do iframe + postMessage + ajuste no host. Implementado no protocolo `typecall:resize`.
- **Double scrollbar**: se iframe tem scroll interno e host tem scroll, pode criar UX ruim. Mitigacao: modo inline sem scroll interno (auto-resize), modos popup/slider com scroll contido.
- **Cookie restrictions**: third-party cookies podem ser bloqueados (Safari ITP, Chrome CHIPS). Mitigacao: nao usar cookies no iframe, toda comunicacao via postMessage.

## Relacionamentos

- [[Fase 4 - Embed]] — implementacao completa do embed system
- [[Form Engine]] — runner renderizado dentro do iframe
