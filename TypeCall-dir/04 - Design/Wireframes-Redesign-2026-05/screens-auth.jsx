// Auth + Onboarding wireframes
// Variation A — Split editorial (image-led, single column right)
// Variation B — Centered minimal card with stepper

function AuthSplit() {
  return (
    <Chrome url="app.typecall.io/login">
      <div style={{ display: 'flex', height: '100%' }}>
        {/* Left — editorial brand panel */}
        <div style={{ flex: '0 0 46%', borderRight: '1px solid var(--line)', background: 'var(--paper-2)', padding: 40, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 22, height: 22, border: '1px solid var(--ink)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hand style={{ fontSize: 12, fontWeight: 600 }}>T</Hand>
            </div>
            <Hand style={{ fontSize: 16 }}>TypeCall</Hand>
          </div>

          <div style={{ marginTop: 60 }}>
            <Mono style={{ color: 'var(--ink-mid)' }}>Para times de pré-venda</Mono>
            <Hand style={{ display: 'block', fontSize: 38, lineHeight: 1.05, marginTop: 14, letterSpacing: '-0.02em' }}>
              Qualifique e <span className="wf-underline">agende</span><br />no mesmo fluxo.
            </Hand>
            <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontSize: 15.5, lineHeight: 1.5, marginTop: 18, color: 'var(--ink-soft)', maxWidth: 420 }}>
              Substitua o Typeform + Calendly por uma conversa fluida que entrega o lead pronto direto na agenda do vendedor.
            </p>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Box style={{ padding: 16, background: 'var(--paper)' }}>
              <Mono style={{ color: 'var(--gold-dk)' }}>★ ★ ★ ★ ★</Mono>
              <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontStyle: 'italic', fontSize: 14, lineHeight: 1.45, marginTop: 8, color: 'var(--ink)' }}>
                "Reduzimos no-show em 41% no primeiro mês. O SDR trabalha 3× mais leads quentes."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <Av letter="M" size="sm" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>Marina Coelho</div>
                  <Mono style={{ color: 'var(--ink-low)' }}>Head de RevOps · Caju</Mono>
                </div>
              </div>
            </Box>
          </div>
        </div>

        {/* Right — form */}
        <div style={{ flex: 1, padding: '40px 56px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Mono style={{ color: 'var(--ink-mid)' }}>Ainda não tem conta?</Mono>
            <Mono style={{ color: 'var(--ink)', textDecoration: 'underline' }}>Criar conta</Mono>
          </div>

          <div style={{ margin: 'auto 0', maxWidth: 380, width: '100%' }}>
            <Mono style={{ color: 'var(--ink-mid)' }}>01 · entrar</Mono>
            <Hand style={{ display: 'block', fontSize: 28, marginTop: 8, marginBottom: 28 }}>
              Bem-vindo de volta.
            </Hand>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Btn className="wf-btn" style={{ width: '100%', justifyContent: 'flex-start', gap: 12, padding: '10px 14px' }}>
                <span style={{ width: 16, height: 16, border: '1px solid var(--ink)', borderRadius: 2 }} />
                Continuar com Google
              </Btn>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <Mono style={{ color: 'var(--ink-low)' }}>OU</Mono>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>

              <div>
                <Label style={{ display: 'block', marginBottom: 6 }}>email do trabalho</Label>
                <Input placeholder="voce@empresa.com" />
              </div>
              <div>
                <Label style={{ display: 'block', marginBottom: 6 }}>senha</Label>
                <Input placeholder="••••••••" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Mono style={{ color: 'var(--ink-mid)' }}>☐ lembrar de mim</Mono>
                <Mono style={{ color: 'var(--ink)', textDecoration: 'underline' }}>esqueci a senha</Mono>
              </div>
              <Btn tone="primary" style={{ width: '100%', padding: '11px 14px', marginTop: 6 }}>
                Entrar →
              </Btn>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Mono style={{ color: 'var(--ink-low)' }}>© TypeCall 2026</Mono>
            <Mono style={{ color: 'var(--ink-low)' }}>SOC 2 · LGPD</Mono>
          </div>
        </div>
      </div>
    </Chrome>
  );
}

function AuthOnboarding() {
  // Variant B — Post-signup onboarding (centered, stepper)
  return (
    <Chrome url="app.typecall.io/onboarding">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* slim top bar */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 22, height: 22, border: '1px solid var(--ink)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hand style={{ fontSize: 12, fontWeight: 600 }}>T</Hand>
            </div>
            <Hand style={{ fontSize: 14 }}>TypeCall</Hand>
          </div>
          <Mono style={{ color: 'var(--ink-mid)' }}>sair</Mono>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 24px', background: 'var(--paper)' }}>
          <div style={{ width: '100%', maxWidth: 720 }}>
            {/* stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
              {[
                { n: '01', label: 'Workspace', state: 'done' },
                { n: '02', label: 'Funil de qualificação', state: 'on' },
                { n: '03', label: 'Calendário', state: 'todo' },
                { n: '04', label: 'Convidar SDRs', state: 'todo' },
              ].map((s, i, arr) => (
                <React.Fragment key={s.n}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 3,
                      border: '1px solid ' + (s.state === 'todo' ? 'var(--line)' : 'var(--ink)'),
                      background: s.state === 'on' ? 'var(--ink)' : s.state === 'done' ? 'var(--paper-2)' : 'transparent',
                      color: s.state === 'on' ? 'var(--paper)' : 'var(--ink)',
                      fontFamily: 'Geist Mono, monospace', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{s.state === 'done' ? '✓' : s.n}</div>
                    <Mono style={{ color: s.state === 'todo' ? 'var(--ink-low)' : 'var(--ink)' }}>{s.label}</Mono>
                  </div>
                  {i < arr.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />}
                </React.Fragment>
              ))}
            </div>

            <Mono style={{ color: 'var(--ink-mid)' }}>passo 02 de 04</Mono>
            <Hand style={{ display: 'block', fontSize: 30, marginTop: 6 }}>
              Como você qualifica um lead hoje?
            </Hand>
            <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-soft)', marginTop: 10, maxWidth: 560 }}>
              Selecione um ponto de partida. Você pode editar tudo depois — vamos só montar a primeira versão do seu funil.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 28 }}>
              {[
                { title: 'SaaS B2B / Demo', sub: 'BANT + nicho · 5 perguntas', selected: true },
                { title: 'Agência / Serviço', sub: 'Budget + escopo · 6 perguntas', selected: false },
                { title: 'High-ticket / Mentoria', sub: 'Faturamento + dor · 7 perguntas', selected: false },
                { title: 'Em branco', sub: 'Começar do zero', selected: false },
              ].map((c, i) => (
                <Box key={i} style={{
                  padding: 16, cursor: 'pointer',
                  borderColor: c.selected ? 'var(--ink)' : 'var(--line)',
                  boxShadow: c.selected ? 'inset 0 0 0 1px var(--ink)' : 'none',
                  background: c.selected ? 'var(--paper-2)' : 'var(--paper)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Mono style={{ color: 'var(--ink-mid)' }}>0{i + 1}</Mono>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '1px solid var(--ink)', background: c.selected ? 'var(--ink)' : 'transparent'
                    }} />
                  </div>
                  <Hand style={{ display: 'block', fontSize: 17, marginTop: 12 }}>{c.title}</Hand>
                  <Mono style={{ color: 'var(--ink-mid)', marginTop: 6, display: 'block' }}>{c.sub}</Mono>
                </Box>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
              <Btn tone="ghost">← voltar</Btn>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn tone="ghost">pular por agora</Btn>
                <Btn tone="primary">Continuar →</Btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Chrome>
  );
}

Object.assign(window, { AuthSplit, AuthOnboarding });
