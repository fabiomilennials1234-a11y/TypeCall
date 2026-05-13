// Public form wireframes — what the LEAD sees
// Variation A — Editorial conversational (Typeform-like full-screen, one Q at a time)
// Variation B — Compact card with side context (faster, premium feel)

function PublicConversational() {
  return (
    <Chrome url="acme.typecall.io/demo-enterprise">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Slim top */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 32px', borderBottom: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, border: '1px solid var(--ink)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hand style={{ fontSize: 10 }}>A</Hand>
            </div>
            <Mono>ACME · Demo Enterprise</Mono>
          </div>
          <Mono style={{ color: 'var(--ink-low)' }}>04 / 07</Mono>
        </div>
        <div style={{ height: 2 }}>
          <div style={{ height: 2, width: '57%', background: 'var(--ink)' }} />
        </div>

        <div style={{ flex: 1, display: 'flex' }}>
          {/* Left — question */}
          <div style={{ flex: '1 1 60%', padding: '64px 80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Mono style={{ color: 'var(--ink-mid)' }}>04 · qualificação</Mono>

            <Hand style={{ display: 'block', fontSize: 44, marginTop: 14, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Quantos SDRs <br/>existem no seu time hoje?
            </Hand>

            <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontSize: 17, lineHeight: 1.5, color: 'var(--ink-soft)', marginTop: 16, maxWidth: 520 }}>
              Vamos calibrar a demonstração ao seu volume. Não compartilhamos esse dado com ninguém fora da Acme.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 36, maxWidth: 480 }}>
              {[
                { k: 'A', t: 'Apenas eu (founder-led)', d: 0 },
                { k: 'B', t: '1 – 5 SDRs', d: 1 },
                { k: 'C', t: '6 – 15 SDRs', d: 1, selected: true },
                { k: 'D', t: '16 – 50 SDRs' },
                { k: 'E', t: 'Mais de 50' },
              ].map(opt => (
                <div key={opt.k} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                  border: '1px solid ' + (opt.selected ? 'var(--ink)' : 'var(--line)'),
                  background: opt.selected ? 'var(--paper-2)' : 'var(--paper)',
                  boxShadow: opt.selected ? 'inset 0 0 0 1px var(--ink)' : 'none',
                  borderRadius: 3,
                }}>
                  <div style={{
                    width: 24, height: 24, border: '1px solid var(--ink)', borderRadius: 3,
                    background: opt.selected ? 'var(--ink)' : 'transparent', color: opt.selected ? 'var(--paper)' : 'var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist Mono', fontSize: 11,
                  }}>{opt.k}</div>
                  <span style={{ fontSize: 15, flex: 1 }}>{opt.t}</span>
                  {opt.selected && <Mono>↵</Mono>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32 }}>
              <Btn tone="primary" style={{ padding: '11px 22px' }}>Continuar <span style={{ marginLeft: 4 }}>↵</span></Btn>
              <Mono style={{ color: 'var(--ink-mid)' }}>aperte enter ou clique uma opção</Mono>
            </div>
          </div>

          {/* Right — context panel (premium touch) */}
          <aside style={{ flex: '0 0 360px', borderLeft: '1px solid var(--line-soft)', padding: 32, background: 'var(--paper-2)', display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <Mono style={{ color: 'var(--ink-mid)' }}>quem vai te atender</Mono>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <Av letter="B" size="lg" />
                <div>
                  <div style={{ fontWeight: 500 }}>Bianca Torres</div>
                  <Mono style={{ color: 'var(--ink-low)' }}>Senior AE · Acme</Mono>
                </div>
              </div>
              <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.4, color: 'var(--ink-soft)', marginTop: 14 }}>
                "Já implementei pré-vendas em 40+ SaaS B2B. Adapto a demo ao seu cenário."
              </p>
            </div>

            <Hr soft />

            <div>
              <Mono style={{ color: 'var(--ink-mid)' }}>tempo restante</Mono>
              <Hand style={{ display: 'block', fontSize: 26, marginTop: 4 }}>~1 min</Hand>
              <div style={{ display: 'flex', gap: 2, marginTop: 10 }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, background: i < 4 ? 'var(--ink)' : 'var(--paper-3)' }} />
                ))}
              </div>
            </div>

            <Hr soft />

            <div>
              <Mono style={{ color: 'var(--ink-mid)' }}>na próxima etapa</Mono>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                <Mono>05 · email</Mono>
                <Mono>06 · agendar</Mono>
                <Mono>07 · confirmação</Mono>
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <Mono style={{ color: 'var(--ink-low)' }}>🛡 dados criptografados · LGPD</Mono>
            </div>
          </aside>
        </div>
      </div>
    </Chrome>
  );
}

function PublicScheduleCard() {
  // Variation B — Schedule step (the calendar selection)
  const days = ['12', '13', '14', '15', '16', '19', '20'];
  const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
  return (
    <Chrome url="acme.typecall.io/demo-enterprise">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 32px', borderBottom: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, border: '1px solid var(--ink)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hand style={{ fontSize: 10 }}>A</Hand>
            </div>
            <Mono>ACME · Demo Enterprise</Mono>
          </div>
          <Mono style={{ color: 'var(--ink-low)' }}>06 / 07</Mono>
        </div>
        <div style={{ height: 2 }}><div style={{ height: 2, width: '85%', background: 'var(--ink)' }} /></div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Box style={{ width: 880, padding: 36, background: 'var(--paper)' }}>
            <div style={{ display: 'flex', gap: 32 }}>
              {/* Left — context */}
              <div style={{ flex: '0 0 220px', borderRight: '1px solid var(--line-soft)', paddingRight: 24 }}>
                <Mono style={{ color: 'var(--ink-mid)' }}>quase lá, mariana</Mono>
                <Hand style={{ display: 'block', fontSize: 26, marginTop: 4, lineHeight: 1.1 }}>
                  Escolha um <span className="wf-underline">horário</span>.
                </Hand>
                <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontSize: 13.5, lineHeight: 1.45, marginTop: 10, color: 'var(--ink-soft)' }}>
                  Sua demonstração de 30 minutos com a Bianca Torres.
                </p>

                <Hr soft />

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Av letter="B" size="md" />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>Bianca Torres</div>
                    <Mono style={{ color: 'var(--ink-low)' }}>Senior AE</Mono>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 14, height: 14, border: '1px solid var(--ink-mid)', borderRadius: 2 }} />
                    <span>30 minutos</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 14, height: 14, border: '1px solid var(--ink-mid)', borderRadius: 2 }} />
                    <span>Google Meet (link após)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 14, height: 14, border: '1px solid var(--ink-mid)', borderRadius: 2 }} />
                    <span>Fuso · America/São_Paulo</span>
                  </div>
                </div>
              </div>

              {/* Middle — days */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Hand style={{ fontSize: 16 }}>Maio 2026</Hand>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn size="sm" tone="ghost">←</Btn>
                    <Btn size="sm" tone="ghost">→</Btn>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => <Mono key={i} style={{ textAlign: 'center', color: 'var(--ink-mid)' }}>{d}</Mono>)}
                  {days.map((n, i) => (
                    <div key={i} style={{
                      padding: '10px 0', border: '1px solid var(--line)', textAlign: 'center',
                      background: n === '14' ? 'var(--ink)' : 'var(--paper)', color: n === '14' ? 'var(--paper)' : 'var(--ink)',
                    }}>
                      <Hand style={{ fontSize: 16 }}>{n}</Hand>
                    </div>
                  ))}
                  {/* row 2 weak */}
                  {['21', '22', '23', '26', '27', '28', '29'].map((n, i) => (
                    <div key={'r2-' + i} style={{ padding: '10px 0', border: '1px solid var(--line-soft)', textAlign: 'center', color: 'var(--ink-low)' }}>
                      <Mono>{n}</Mono>
                    </div>
                  ))}
                </div>
                <Mono style={{ color: 'var(--ink-mid)', display: 'block', marginTop: 10 }}>14 horários disponíveis em 7 dias</Mono>
              </div>

              {/* Right — slots */}
              <div style={{ flex: '0 0 200px', borderLeft: '1px solid var(--line-soft)', paddingLeft: 24 }}>
                <Mono style={{ color: 'var(--ink-mid)' }}>Qua · 14 mai</Mono>
                <Hand style={{ display: 'block', fontSize: 16, marginTop: 4, marginBottom: 12 }}>Horários</Hand>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflow: 'auto' }}>
                  {slots.map((s, i) => (
                    <div key={s} style={{
                      padding: '8px 12px', border: '1px solid ' + (i === 4 ? 'var(--ink)' : 'var(--line)'),
                      background: i === 4 ? 'var(--ink)' : 'var(--paper)',
                      color: i === 4 ? 'var(--paper)' : 'var(--ink)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <Mono style={{ color: i === 4 ? 'var(--paper)' : 'var(--ink)' }}>{s}</Mono>
                      {i === 4 && <Mono>→</Mono>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Hr soft />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Mono style={{ color: 'var(--ink-mid)' }}>← voltar</Mono>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Mono>14 mai · 11:00 – 11:30</Mono>
                <Btn tone="primary">Confirmar reunião →</Btn>
              </div>
            </div>
          </Box>
        </div>
      </div>
    </Chrome>
  );
}

Object.assign(window, { PublicConversational, PublicScheduleCard });
