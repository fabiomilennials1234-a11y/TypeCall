// Marketing landing wireframes
// Variation A — Editorial hero with serif headline (Stripe/Linear hybrid)
// Variation B — Bold product-first with above-fold dashboard preview

function LandingEditorial() {
  return (
    <Chrome url="typecall.io">
      <div style={{ height: '100%', overflow: 'auto' }}>
        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 60px', borderBottom: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, border: '1px solid var(--ink)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hand style={{ fontSize: 13 }}>T</Hand>
            </div>
            <Hand style={{ fontSize: 16 }}>TypeCall</Hand>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            {['Produto', 'Para SDRs', 'Para Founders', 'Clientes', 'Preço', 'Docs'].map(n => <span key={n}>{n}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn size="sm" tone="ghost">Entrar</Btn>
            <Btn size="sm" tone="primary">Começar grátis</Btn>
          </div>
        </div>

        {/* Hero */}
        <section style={{ padding: '90px 60px 60px', maxWidth: 1400, margin: '0 auto' }}>
          <Mono style={{ color: 'var(--gold-dk)' }}>★ usado por 1.400+ times de pré-venda no Brasil</Mono>
          <Hand style={{ display: 'block', fontSize: 88, lineHeight: 0.96, letterSpacing: '-0.035em', marginTop: 18, maxWidth: 1100 }}>
            Qualifique e <span className="wf-underline">agende</span><br />
            no <em style={{ fontStyle: 'italic' }}>mesmo</em> respiro.
          </Hand>
          <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontSize: 22, lineHeight: 1.4, color: 'var(--ink-soft)', maxWidth: 720, marginTop: 28 }}>
            TypeCall substitui Typeform + Calendly por um único fluxo conversacional. O lead se qualifica e cai na agenda certa do vendedor certo, em 90 segundos.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <Btn tone="primary" style={{ padding: '13px 22px' }}>Começar grátis →</Btn>
            <Btn style={{ padding: '13px 22px' }}>▷ Ver demonstração · 2min</Btn>
            <Mono style={{ alignSelf: 'center', color: 'var(--ink-mid)', marginLeft: 8 }}>14d trial · sem cartão</Mono>
          </div>

          {/* Hero visual placeholder */}
          <div style={{ marginTop: 56, border: '1px solid var(--ink)', borderRadius: 4, background: 'var(--paper-2)', height: 420, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6 }}>
              <i style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--paper)', border: '1px solid var(--line)' }} />
              <i style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--paper)', border: '1px solid var(--line)' }} />
              <i style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--paper)', border: '1px solid var(--line)' }} />
            </div>
            <div style={{ position: 'absolute', inset: '50px 60px', background: 'var(--paper)', border: '1px solid var(--line)' }}>
              <Ph w="100%" h="100%" text="[ HERO PRODUCT FRAME — dashboard hi-fi ]" img />
            </div>
          </div>

          {/* logo strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 50, paddingTop: 30, borderTop: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
            <Mono style={{ color: 'var(--ink-mid)' }}>times que usam typecall</Mono>
            {['BRAVA', 'CAJU', 'ACME', 'STEIN&CO', 'KAWAI', 'NASSER', 'TOLEDO'].map(b => (
              <Hand key={b} style={{ fontSize: 15, color: 'var(--ink-mid)', letterSpacing: '0.06em' }}>{b}</Hand>
            ))}
          </div>
        </section>

        {/* Number band */}
        <section style={{ borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--ink)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: 'var(--paper-2)' }}>
          {[
            ['41%', 'redução de no-show'],
            ['3,2×', 'mais leads qualificados / SDR'],
            ['90s', 'tempo médio do funil'],
            ['1d', 'setup completo'],
          ].map(([n, l], i) => (
            <div key={i} style={{ padding: '36px 32px', borderRight: i < 3 ? '1px solid var(--line)' : 'none' }}>
              <Hand style={{ fontSize: 56, letterSpacing: '-0.025em', lineHeight: 1 }}>{n}</Hand>
              <Mono style={{ color: 'var(--ink-mid)', marginTop: 10, display: 'block' }}>{l}</Mono>
            </div>
          ))}
        </section>

        {/* Three pillars */}
        <section style={{ padding: '80px 60px', maxWidth: 1400, margin: '0 auto' }}>
          <Mono style={{ color: 'var(--ink-mid)' }}>como funciona</Mono>
          <Hand style={{ display: 'block', fontSize: 44, marginTop: 10, letterSpacing: '-0.02em' }}>
            Três peças que <span className="wf-underline">deveriam</span> ser uma só.
          </Hand>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 44 }}>
            {[
              { n: '01', t: 'Funil conversacional', d: 'Lead responde uma pergunta por tela. Score, tag e desqualificação automáticos.', tag: 'Builder' },
              { n: '02', t: 'Calendário fundido', d: 'Vendedor escolhido pela tag. Round-robin, fuso, buffer e Google/Outlook nativos.', tag: 'Schedule' },
              { n: '03', t: 'Pipeline em tempo real', d: 'No-show, remarcação e receita. Envio para Salesforce, Pipedrive, Slack ou webhook.', tag: 'Analytics' },
            ].map(p => (
              <div key={p.n} style={{ paddingTop: 22, borderTop: '1px solid var(--ink)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Mono>{p.n}</Mono>
                  <Pill>{p.tag}</Pill>
                </div>
                <Hand style={{ display: 'block', fontSize: 24, marginTop: 14, letterSpacing: '-0.012em' }}>{p.t}</Hand>
                <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)', marginTop: 10 }}>{p.d}</p>
                <Mono style={{ color: 'var(--ink)', marginTop: 16, display: 'block' }}>conheça →</Mono>
              </div>
            ))}
          </div>
        </section>

        {/* Quote */}
        <section style={{ padding: '80px 60px', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <Mono style={{ color: 'var(--gold-dk)' }}>★ ★ ★ ★ ★</Mono>
          <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontSize: 30, lineHeight: 1.35, fontStyle: 'italic', marginTop: 14, letterSpacing: '-0.005em' }}>
            "Substituímos seis ferramentas, dobramos a conversão e o SDR <span className="wf-underline">finalmente</span> dorme à noite."
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 22 }}>
            <Av letter="M" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Marina Coelho</div>
              <Mono style={{ color: 'var(--ink-mid)' }}>Head de RevOps · Caju</Mono>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '80px 60px', maxWidth: 1400, margin: '0 auto' }}>
          <Box style={{ padding: '54px 48px', background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }}>
            <Mono style={{ color: 'var(--paper-2)' }}>setup em 1 dia</Mono>
            <Hand style={{ display: 'block', fontSize: 52, color: 'var(--paper)', marginTop: 10, letterSpacing: '-0.025em' }}>
              Pronto para entregar leads quentes diretos na agenda?
            </Hand>
            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <Btn tone="gold" style={{ padding: '13px 22px' }}>Começar grátis →</Btn>
              <Btn style={{ background: 'transparent', color: 'var(--paper)', borderColor: 'var(--paper)' }}>Agendar com vendas</Btn>
            </div>
          </Box>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--line)', padding: '40px 60px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, border: '1px solid var(--ink)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Hand style={{ fontSize: 11 }}>T</Hand>
              </div>
              <Hand style={{ fontSize: 14 }}>TypeCall</Hand>
            </div>
            <Mono style={{ color: 'var(--ink-mid)', display: 'block', marginTop: 8 }}>typeform + calendly, fundidos.</Mono>
          </div>
          <div style={{ display: 'flex', gap: 60, fontSize: 12 }}>
            <div>
              <Mono style={{ color: 'var(--ink-mid)' }}>produto</Mono>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {['Builder', 'Schedule', 'Analytics', 'Embed'].map(l => <span key={l}>{l}</span>)}
              </div>
            </div>
            <div>
              <Mono style={{ color: 'var(--ink-mid)' }}>empresa</Mono>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {['Clientes', 'Preço', 'Carreiras', 'Blog'].map(l => <span key={l}>{l}</span>)}
              </div>
            </div>
            <div>
              <Mono style={{ color: 'var(--ink-mid)' }}>legal</Mono>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {['LGPD', 'Termos', 'Segurança', 'Status'].map(l => <span key={l}>{l}</span>)}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Chrome>
  );
}

function LandingProductFirst() {
  return (
    <Chrome url="typecall.io">
      <div style={{ height: '100%', overflow: 'auto', background: 'var(--paper)' }}>
        {/* Top nav with stronger structure */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '1px solid var(--ink)', background: 'var(--paper)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 22, height: 22, background: 'var(--ink)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Hand style={{ fontSize: 12, color: 'var(--paper)' }}>T</Hand>
              </div>
              <Hand style={{ fontSize: 16 }}>TypeCall</Hand>
            </div>
            <div style={{ display: 'flex', gap: 22, fontSize: 13 }}>
              {['Produto ▾', 'Soluções ▾', 'Clientes', 'Preço', 'Docs'].map(n => <span key={n}>{n}</span>)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn size="sm" tone="ghost">Falar com vendas</Btn>
            <Btn size="sm" tone="primary">Começar grátis →</Btn>
          </div>
        </div>

        {/* Hero — two col */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--ink)' }}>
          <div style={{ padding: '64px 48px', borderRight: '1px solid var(--ink)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', border: '1px solid var(--ink)', background: 'var(--paper-2)' }}>
              <Mono style={{ color: 'var(--gold-dk)' }}>NOVO</Mono>
              <Mono>Sales OS para SDRs</Mono>
            </div>
            <Hand style={{ display: 'block', fontSize: 64, lineHeight: 1, letterSpacing: '-0.03em', marginTop: 24 }}>
              Um funil.<br />
              Um <span className="wf-underline">vendedor</span>.<br />
              Uma agenda.
            </Hand>
            <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontSize: 18, lineHeight: 1.45, color: 'var(--ink-soft)', marginTop: 24, maxWidth: 460 }}>
              TypeCall é o cérebro entre o anúncio e a venda. Qualifica o lead, atribui o SDR certo e cola na agenda — sem Zapier, sem planilha.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
              <Btn tone="primary" style={{ padding: '12px 18px' }}>Começar grátis →</Btn>
              <Btn style={{ padding: '12px 18px' }}>Ver demo</Btn>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 22, alignItems: 'center' }}>
              <Mono style={{ color: 'var(--ink-mid)' }}>✓ 14d grátis</Mono>
              <Mono style={{ color: 'var(--ink-mid)' }}>✓ sem cartão</Mono>
              <Mono style={{ color: 'var(--ink-mid)' }}>✓ SOC 2 / LGPD</Mono>
            </div>
          </div>

          {/* Dashboard preview */}
          <div style={{ padding: '40px 40px', background: 'var(--paper-2)', position: 'relative' }}>
            <Note style={{ top: 18, right: 32 }}>Dashboard real, sem mockup.</Note>
            <Ph w="100%" h={520} text="[ DASHBOARD PRODUCT FRAME — real screenshot ]" img />
          </div>
        </section>

        {/* Features matrix */}
        <section style={{ padding: '64px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Hand style={{ fontSize: 36, letterSpacing: '-0.02em' }}>Tudo o que substituímos.</Hand>
            <Mono style={{ color: 'var(--ink-mid)' }}>typecall vs. stack atual</Mono>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(5, 1fr)', marginTop: 32, border: '1px solid var(--ink)' }}>
            {/* header row */}
            <div style={{ padding: 14, borderRight: '1px solid var(--line)', background: 'var(--paper-2)' }}>
              <Mono style={{ color: 'var(--ink-mid)' }}>capacidade</Mono>
            </div>
            {['TypeCall', 'Typeform', 'Calendly', 'Zapier', 'Sheets'].map((n, i, arr) => (
              <div key={n} style={{ padding: 14, borderRight: i < arr.length - 1 ? '1px solid var(--line)' : 'none', background: i === 0 ? 'var(--ink)' : 'var(--paper-2)', color: i === 0 ? 'var(--paper)' : 'var(--ink)' }}>
                <Hand style={{ fontSize: 16 }}>{n}</Hand>
              </div>
            ))}

            {[
              ['Funil conversacional', 1, 1, 0, 0, 0],
              ['Calendário com round-robin', 1, 0, 1, 0, 0],
              ['Qualificação automática (BANT)', 1, 0, 0, 0, 0],
              ['Atribuição por score', 1, 0, 0, 0, 0],
              ['Reduz no-show (lembretes inteligentes)', 1, 0, 0.5, 0, 0],
              ['Analytics fim-a-fim', 1, 0.5, 0.5, 0, 0.5],
              ['Webhook + CRM nativos', 1, 0.5, 0.5, 1, 0],
            ].map((row, ri) => (
              <React.Fragment key={ri}>
                <div style={{ padding: 14, borderTop: '1px solid var(--line)', borderRight: '1px solid var(--line)', fontSize: 13 }}>{row[0]}</div>
                {row.slice(1).map((v, i) => (
                  <div key={i} style={{ padding: 14, borderTop: '1px solid var(--line)', borderRight: i < 4 ? '1px solid var(--line)' : 'none', textAlign: 'center', background: i === 0 ? 'var(--paper)' : 'var(--paper)' }}>
                    {v === 1 ? <Hand style={{ fontSize: 18 }}>●</Hand> : v === 0.5 ? <Mono style={{ color: 'var(--ink-mid)' }}>½</Mono> : <Mono style={{ color: 'var(--ink-low)' }}>—</Mono>}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Pricing strip */}
        <section style={{ padding: '40px 40px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { n: 'Starter', p: 'R$ 0', sub: '1 funil · 50 leads/mês', cta: 'Começar' },
              { n: 'Growth', p: 'R$ 290', sub: '5 funis · 1.000 leads/mês · CRM sync', cta: 'Começar trial', hot: true },
              { n: 'Enterprise', p: 'sob consulta', sub: 'ilimitado · SSO · SLA · CSM', cta: 'Falar com vendas' },
            ].map(p => (
              <Box key={p.n} style={{
                padding: 24,
                background: p.hot ? 'var(--ink)' : 'var(--paper)',
                color: p.hot ? 'var(--paper)' : 'var(--ink)',
                borderColor: 'var(--ink)',
                position: 'relative'
              }}>
                {p.hot && <Pill tone="gold" style={{ position: 'absolute', top: -10, left: 24 }}>mais popular</Pill>}
                <Hand style={{ fontSize: 22, color: p.hot ? 'var(--paper)' : 'var(--ink)' }}>{p.n}</Hand>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 16 }}>
                  <Hand style={{ fontSize: 40, letterSpacing: '-0.025em', color: p.hot ? 'var(--paper)' : 'var(--ink)' }}>{p.p}</Hand>
                  <Mono style={{ color: p.hot ? 'var(--paper-3)' : 'var(--ink-mid)' }}>/mês</Mono>
                </div>
                <Mono style={{ color: p.hot ? 'var(--paper-3)' : 'var(--ink-mid)', display: 'block', marginTop: 8 }}>{p.sub}</Mono>
                <Btn tone={p.hot ? 'gold' : 'primary'} style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}>{p.cta}</Btn>
              </Box>
            ))}
          </div>
        </section>
      </div>
    </Chrome>
  );
}

Object.assign(window, { LandingEditorial, LandingProductFirst });
