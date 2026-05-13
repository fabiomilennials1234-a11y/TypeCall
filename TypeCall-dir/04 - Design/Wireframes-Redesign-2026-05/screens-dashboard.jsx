// Dashboard wireframes
// Variation A — Editorial split (hero KPI + sidebar of context)
// Variation B — Operator dashboard (denser grid, more numbers visible at once)

function DashboardEditorial() {
  return (
    <AppFrame
      active="dashboard"
      title="Dashboard"
      crumbs={["Acme Vendas"]}
      headerRight={
        <>
          <div className="wf-input" style={{ padding: '6px 10px' }}>
            <Mono style={{ color: 'var(--ink-low)' }}>Período</Mono>
            <Mono>30d ▾</Mono>
          </div>
          <Btn size="sm">Exportar</Btn>
          <Btn size="sm" tone="primary">+ Novo funil</Btn>
        </>
      }
    >
      <div style={{ height: '100%', overflow: 'auto', padding: '32px 40px' }}>
        {/* Hero strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderTop: '1px solid var(--ink)', borderBottom: '1px solid var(--line)' }}>
          {[
            { lbl: 'Reuniões agendadas', big: '142', delta: '+18% vs. 30d ant.', spark: true },
            { lbl: 'Taxa de no-show', big: '12,4%', delta: '−3,1pp', tone: 'good' },
            { lbl: 'Receita atribuída', big: 'R$ 384k', delta: '+22%' },
          ].map((k, i) => (
            <div key={i} style={{
              padding: '22px 24px',
              borderRight: i < 2 ? '1px solid var(--line)' : 'none',
              display: 'flex', flexDirection: 'column', gap: 8
            }}>
              <Label>{k.lbl}</Label>
              <Hand style={{ fontSize: 42, lineHeight: 1, letterSpacing: '-0.025em' }}>{k.big}</Hand>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mono style={{ color: k.tone === 'good' ? 'var(--good)' : 'var(--ink-mid)' }}>{k.delta}</Mono>
                {/* tiny inline sparkline */}
                <svg width="80" height="14" viewBox="0 0 80 14" style={{ opacity: 0.7 }}>
                  <polyline points="0,10 12,7 22,9 34,6 46,4 58,7 70,3 80,5" fill="none" stroke="var(--ink)" strokeWidth="1" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, marginTop: 28 }}>
          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Funnel */}
            <Box style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
                <Hand style={{ fontSize: 18 }}>Funil — últimos 30 dias</Hand>
                <Mono style={{ color: 'var(--ink-low)' }}>etapas · drop-off</Mono>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { step: 'Iniciaram', n: 2840, pct: 100 },
                  { step: 'Qualificaram', n: 1208, pct: 42 },
                  { step: 'Selecionaram horário', n: 412, pct: 14.5 },
                  { step: 'Compareceram', n: 361, pct: 12.7 },
                  { step: 'Fecharam', n: 84, pct: 3.0 },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 70px 50px', gap: 14, alignItems: 'center' }}>
                    <Mono>{String(i + 1).padStart(2, '0')} · {r.step}</Mono>
                    <div style={{ height: 22, border: '1px solid var(--line)', background: 'var(--paper-2)', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, width: `${r.pct}%`, background: i === 4 ? 'var(--gold-bg)' : 'var(--paper-3)', borderRight: '1px solid var(--ink)' }} />
                    </div>
                    <Mono style={{ textAlign: 'right', color: 'var(--ink)' }}>{r.n.toLocaleString('pt-BR')}</Mono>
                    <Mono style={{ textAlign: 'right', color: 'var(--ink-mid)' }}>{r.pct}%</Mono>
                  </div>
                ))}
              </div>
            </Box>

            {/* Per-seller */}
            <Box style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <Hand style={{ fontSize: 18 }}>Conversão por vendedor</Hand>
                <Mono style={{ color: 'var(--ink-low)' }}>5 ativos</Mono>
              </div>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Vendedor', 'Reuniões', 'Vendas', 'Conv.', 'Ticket méd.', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 0', fontFamily: 'Geist Mono', fontSize: 10.5, color: 'var(--ink-mid)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { n: 'Bianca Torres', r: 42, v: 19, c: 45, t: 'R$ 8,4k' },
                    { n: 'Diego Aoki', r: 38, v: 14, c: 37, t: 'R$ 7,9k' },
                    { n: 'Rafael Praxedes', r: 31, v: 9, c: 29, t: 'R$ 12,1k' },
                    { n: 'Cláudia Mendes', r: 24, v: 7, c: 29, t: 'R$ 6,2k' },
                  ].map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                      <td style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Av letter={s.n[0]} size="sm" />
                        <span style={{ fontWeight: 500 }}>{s.n}</span>
                      </td>
                      <td style={{ fontFamily: 'Geist Mono', fontSize: 12 }}>{s.r}</td>
                      <td style={{ fontFamily: 'Geist Mono', fontSize: 12 }}>{s.v}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 4, background: 'var(--paper-3)', position: 'relative', borderRadius: 2 }}>
                          <div style={{ position: 'absolute', inset: 0, width: `${s.c * 2}%`, background: 'var(--ink)' }} />
                        </div>
                        <Mono>{s.c}%</Mono>
                      </div></td>
                      <td style={{ fontFamily: 'Geist Mono', fontSize: 12 }}>{s.t}</td>
                      <td style={{ textAlign: 'right' }}><Mono style={{ color: 'var(--ink-mid)' }}>→</Mono></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Box style={{ padding: 20 }}>
              <Label>Distribuição de leads</Label>
              <Hand style={{ display: 'block', fontSize: 17, marginTop: 4 }}>Por etiqueta</Hand>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 16 }}>
                {/* Donut */}
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="44" fill="none" stroke="var(--paper-3)" strokeWidth="14" />
                  <circle cx="60" cy="60" r="44" fill="none" stroke="var(--ink)" strokeWidth="14" strokeDasharray="115 276" />
                  <circle cx="60" cy="60" r="44" fill="none" stroke="var(--gold)" strokeWidth="14" strokeDasharray="68 276" strokeDashoffset="-115" />
                  <circle cx="60" cy="60" r="44" fill="none" stroke="var(--ink-soft)" strokeWidth="14" strokeDasharray="46 276" strokeDashoffset="-183" />
                </svg>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { c: 'var(--ink)', l: 'Diamond', n: 24 },
                    { c: 'var(--gold)', l: 'Gold', n: 41 },
                    { c: 'var(--ink-soft)', l: 'Silver', n: 38 },
                    { c: 'var(--paper-3)', l: 'Bronze', n: 27 },
                    { c: '#8a2a2a', l: 'Desq.', n: 12 },
                  ].map(r => (
                    <div key={r.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, background: r.c }} />
                        <span>{r.l}</span>
                      </div>
                      <Mono>{r.n}</Mono>
                    </div>
                  ))}
                </div>
              </div>
            </Box>

            <Box style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Hand style={{ fontSize: 17 }}>Próximas reuniões</Hand>
                <Mono style={{ color: 'var(--ink-low)' }}>hoje · 6</Mono>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
                {[
                  { t: '09:30', n: 'Lucas Pereira', tag: 'Gold', v: 'Bianca' },
                  { t: '11:00', n: 'Tatiana Vilas Boas', tag: 'Diamond', v: 'Diego' },
                  { t: '14:00', n: 'Rômulo Sá', tag: 'Silver', v: 'Bianca' },
                  { t: '15:30', n: 'Mariana Kawai', tag: 'Gold', v: 'Rafael' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr auto', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 'none' }}>
                    <Mono>{m.t}</Mono>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{m.n}</div>
                      <Mono style={{ color: 'var(--ink-low)' }}>com {m.v}</Mono>
                    </div>
                    <Pill tone={m.tag === 'Diamond' ? 'accent' : m.tag === 'Gold' ? 'gold' : 'default'}>{m.tag}</Pill>
                  </div>
                ))}
              </div>
            </Box>

            <Box style={{ padding: 20, background: 'var(--paper-2)' }}>
              <Label style={{ color: 'var(--gold-dk)' }}>insight</Label>
              <Hand style={{ display: 'block', fontSize: 17, marginTop: 4 }}>
                <span className="wf-underline">3 leads Gold</span> ainda não confirmaram presença
              </Hand>
              <Mono style={{ color: 'var(--ink-mid)', marginTop: 10, display: 'block' }}>enviar lembrete →</Mono>
            </Box>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

function DashboardOperator() {
  return (
    <AppFrame
      active="dashboard"
      title="Sales Dashboard"
      crumbs={["Acme Vendas", "Operações"]}
      headerRight={
        <>
          <Pill>● live</Pill>
          <div className="wf-input" style={{ padding: '6px 10px' }}><Mono>Bianca, Diego, +3</Mono></div>
          <div className="wf-input" style={{ padding: '6px 10px' }}><Mono>30d ▾</Mono></div>
          <Btn size="sm">⚙</Btn>
        </>
      }
    >
      <div style={{ height: '100%', overflow: 'auto', padding: 24 }}>
        {/* 6-card KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0, border: '1px solid var(--line)' }}>
          {[
            { l: 'Iniciaram', v: '2.840', d: '+12%' },
            { l: 'Qualificaram', v: '1.208', d: '+18%' },
            { l: 'Agendaram', v: '412', d: '+9%' },
            { l: 'Compareceram', v: '361', d: '−3%', tone: 'bad' },
            { l: 'Fecharam', v: '84', d: '+22%' },
            { l: 'Receita', v: 'R$ 384k', d: '+22%' },
          ].map((k, i) => (
            <div key={i} style={{ padding: 14, borderRight: i < 5 ? '1px solid var(--line)' : 'none', borderBottom: 'none' }}>
              <Label>{k.l}</Label>
              <Hand style={{ display: 'block', fontSize: 22, marginTop: 4 }}>{k.v}</Hand>
              <Mono style={{ color: k.tone === 'bad' ? 'var(--bad)' : 'var(--good)' }}>{k.d}</Mono>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 16 }}>
          {/* Big chart area */}
          <Box style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div>
                <Mono style={{ color: 'var(--ink-mid)' }}>tendência · 30 dias</Mono>
                <Hand style={{ display: 'block', fontSize: 17, marginTop: 2 }}>Reuniões / dia</Hand>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, background: 'var(--ink)' }} /> agendadas</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, background: 'var(--gold)' }} /> compareceram</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, background: '#8a2a2a' }} /> no-show</span>
              </div>
            </div>
            {/* Bar chart */}
            <svg viewBox="0 0 600 200" width="100%" height="200" style={{ display: 'block' }}>
              {/* gridlines */}
              {[40, 80, 120, 160].map(y => (
                <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="var(--line-soft)" strokeWidth="1" />
              ))}
              {/* bars */}
              {Array.from({ length: 30 }).map((_, i) => {
                const x = i * 20 + 4;
                const h1 = 30 + Math.abs(Math.sin(i * 0.6)) * 90;
                const h2 = h1 * (0.55 + Math.abs(Math.cos(i * 0.4)) * 0.3);
                const ns = h1 - h2;
                return (
                  <g key={i}>
                    <rect x={x} y={200 - h2} width="12" height={h2} fill="var(--gold)" />
                    <rect x={x} y={200 - h1} width="12" height={ns} fill="#8a2a2a" opacity="0.85" />
                  </g>
                );
              })}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {['01 abr', '08', '15', '22', '30'].map(d => <Mono key={d} style={{ color: 'var(--ink-low)' }}>{d}</Mono>)}
            </div>
          </Box>

          {/* Heatmap of best hours */}
          <Box style={{ padding: 16 }}>
            <Label>melhor horário para reuniões</Label>
            <Hand style={{ display: 'block', fontSize: 17, marginTop: 4 }}>Heatmap · 30d</Hand>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(7, 1fr)', gap: 2, marginTop: 14 }}>
              <div />
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => <Mono key={d} style={{ textAlign: 'center', color: 'var(--ink-mid)', fontSize: 9 }}>{d}</Mono>)}
              {['09', '10', '11', '12', '14', '15', '16', '17', '18'].map((h, ri) => (
                <React.Fragment key={h}>
                  <Mono style={{ color: 'var(--ink-mid)', fontSize: 9, textAlign: 'right', paddingRight: 4 }}>{h}h</Mono>
                  {Array.from({ length: 7 }).map((_, ci) => {
                    const v = Math.abs(Math.sin(ri * 0.9 + ci * 0.7));
                    const bg = ci >= 5 ? 'var(--paper-2)' : v > 0.7 ? 'var(--ink)' : v > 0.45 ? 'var(--ink-soft)' : v > 0.2 ? 'var(--paper-3)' : 'var(--paper-2)';
                    return <div key={ci} style={{ height: 16, background: bg, border: '1px solid var(--line-soft)' }} />;
                  })}
                </React.Fragment>
              ))}
            </div>
          </Box>
        </div>

        {/* Bottom: pipeline + tag table */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <Box style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Hand style={{ fontSize: 17 }}>Pipeline em aberto</Hand>
              <Mono style={{ color: 'var(--ink-low)' }}>R$ 1,24M · 87 deals</Mono>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {[
                { s: 'Aguardando call', n: 28, v: 'R$ 312k', pct: 36 },
                { s: 'Em negociação', n: 41, v: 'R$ 624k', pct: 47 },
                { s: 'Proposta', n: 12, v: 'R$ 218k', pct: 14 },
                { s: 'Fechamento', n: 6, v: 'R$ 86k', pct: 3 },
              ].map(p => (
                <div key={p.s} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 80px 60px', gap: 8, alignItems: 'center' }}>
                  <Mono>{p.s}</Mono>
                  <div style={{ height: 14, background: 'var(--paper-2)', border: '1px solid var(--line-soft)' }}>
                    <div style={{ width: `${p.pct}%`, height: '100%', background: 'var(--ink)' }} />
                  </div>
                  <Mono style={{ textAlign: 'right' }}>{p.v}</Mono>
                  <Mono style={{ textAlign: 'right', color: 'var(--ink-mid)' }}>{p.n} deals</Mono>
                </div>
              ))}
            </div>
          </Box>

          <Box style={{ padding: 16 }}>
            <Hand style={{ fontSize: 17 }}>Top funis</Hand>
            <table style={{ width: '100%', marginTop: 10, fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Funil', 'Init.', 'Agend.', 'Conv.', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 0', fontFamily: 'Geist Mono', fontSize: 9.5, color: 'var(--ink-mid)', textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {[
                  { n: 'Demo Enterprise', i: 842, a: 162, c: 19.2 },
                  { n: 'Trial qualificado', i: 1240, a: 184, c: 14.8 },
                  { n: 'Webinar follow-up', i: 412, a: 41, c: 9.9 },
                  { n: 'Outbound LinkedIn', i: 318, a: 22, c: 6.9 },
                ].map(r => (
                  <tr key={r.n} style={{ borderTop: '1px solid var(--line-soft)' }}>
                    <td style={{ padding: '8px 0' }}>{r.n}</td>
                    <td><Mono>{r.i}</Mono></td>
                    <td><Mono>{r.a}</Mono></td>
                    <td><Mono>{r.c}%</Mono></td>
                    <td style={{ textAlign: 'right' }}><Mono style={{ color: 'var(--ink-mid)' }}>→</Mono></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </div>
      </div>
    </AppFrame>
  );
}

Object.assign(window, { DashboardEditorial, DashboardOperator });
