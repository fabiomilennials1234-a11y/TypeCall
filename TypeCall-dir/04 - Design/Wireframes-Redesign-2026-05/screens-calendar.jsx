// Calendar / Bookings wireframes
// Variation A — Week view with side detail (calendar app feel)
// Variation B — Kanban/pipeline of upcoming bookings with filters

function CalendarWeek() {
  const days = ['Seg 12', 'Ter 13', 'Qua 14', 'Qui 15', 'Sex 16', 'Sáb 17', 'Dom 18'];
  const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

  // Events: {day, startH, durH, title, seller, tag}
  const evs = [
    { d: 0, s: 9, h: 1, t: 'Lucas Pereira', sl: 'Bianca', tag: 'gold' },
    { d: 0, s: 14, h: 0.5, t: 'Acme Corp', sl: 'Diego', tag: 'silver' },
    { d: 1, s: 11, h: 1, t: 'Tatiana V. Boas', sl: 'Diego', tag: 'diamond' },
    { d: 1, s: 15, h: 1, t: 'Rômulo Sá', sl: 'Bianca', tag: 'silver' },
    { d: 2, s: 10, h: 1.5, t: 'Mariana Kawai', sl: 'Rafael', tag: 'gold', selected: true },
    { d: 2, s: 16, h: 0.5, t: 'Toledo S.A.', sl: 'Cláudia', tag: 'bronze' },
    { d: 3, s: 9, h: 1, t: 'Pedro Cunha', sl: 'Bianca', tag: 'gold' },
    { d: 3, s: 13, h: 1, t: 'Vitor B. P.', sl: 'Diego', tag: 'diamond' },
    { d: 4, s: 10, h: 1, t: 'Karen Lebon', sl: 'Bianca', tag: 'silver' },
    { d: 4, s: 14, h: 1, t: 'Pestillo MEI', sl: 'Cláudia', tag: 'bronze' },
  ];

  const tagBg = {
    diamond: 'var(--ink)',
    gold: 'var(--gold-bg)',
    silver: 'var(--paper-2)',
    bronze: 'var(--paper-3)',
  };
  const tagFg = {
    diamond: 'var(--paper)',
    gold: 'var(--ink)',
    silver: 'var(--ink)',
    bronze: 'var(--ink)',
  };

  return (
    <AppFrame
      active="bookings"
      title="Reuniões"
      crumbs={["Acme Vendas"]}
      headerRight={
        <>
          <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 3 }}>
            {['Dia', 'Semana', 'Mês', 'Lista'].map((t, i) => (
              <span key={t} style={{ padding: '6px 10px', borderRight: i < 3 ? '1px solid var(--line)' : 'none', fontSize: 12, background: i === 1 ? 'var(--ink)' : 'transparent', color: i === 1 ? 'var(--paper)' : 'var(--ink)' }}>{t}</span>
            ))}
          </div>
          <Btn size="sm">＋ Bloquear horário</Btn>
        </>
      }
    >
      <div style={{ display: 'flex', height: '100%' }}>
        {/* Main calendar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* sub toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px', borderBottom: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Btn size="sm" tone="ghost">←</Btn>
              <Btn size="sm" tone="ghost">Hoje</Btn>
              <Btn size="sm" tone="ghost">→</Btn>
            </div>
            <Hand style={{ fontSize: 18 }}>Maio 12 – 18, 2026</Hand>
            <div style={{ flex: 1 }} />
            <Mono style={{ color: 'var(--ink-mid)' }}>vendedores</Mono>
            <div style={{ display: 'flex', gap: -8 }}>
              {['B', 'D', 'R', 'C'].map((l, i) => (
                <div key={l} style={{ marginLeft: i ? -8 : 0 }}>
                  <Av letter={l} size="sm" />
                </div>
              ))}
              <div style={{ marginLeft: -8 }}><Av letter="+" size="sm" style={{ background: 'var(--paper-3)' }} /></div>
            </div>
          </div>

          {/* Grid */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', overflow: 'auto' }}>
            {/* header row */}
            <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }} />
            {days.map((d, i) => (
              <div key={d} style={{ padding: '10px 8px', borderBottom: '1px solid var(--line)', borderLeft: '1px solid var(--line-soft)', background: 'var(--paper-2)' }}>
                <Mono style={{ color: 'var(--ink-mid)' }}>{d.split(' ')[0]}</Mono>
                <Hand style={{ display: 'block', fontSize: 17, marginTop: 2 }}>{d.split(' ')[1]}</Hand>
              </div>
            ))}

            {/* hour rows */}
            {hours.map((h, ri) => (
              <React.Fragment key={h}>
                <div style={{ borderBottom: '1px solid var(--line-soft)', padding: '4px 6px', textAlign: 'right' }}>
                  <Mono style={{ color: 'var(--ink-low)' }}>{h}:00</Mono>
                </div>
                {days.map((d, di) => (
                  <div key={di + h} style={{ height: 52, borderLeft: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)', position: 'relative' }}>
                    {evs.filter(e => e.d === di && e.s === parseInt(h)).map((e, i) => (
                      <div key={i} style={{
                        position: 'absolute', inset: '2px 4px 2px 4px',
                        height: e.h * 52 - 4,
                        background: tagBg[e.tag], color: tagFg[e.tag],
                        border: '1px solid var(--ink)', padding: '6px 8px',
                        boxShadow: e.selected ? '0 0 0 2px var(--gold)' : 'none',
                        overflow: 'hidden'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <Mono style={{ fontSize: 9, color: e.tag === 'diamond' ? 'var(--paper-3)' : 'var(--ink-mid)' }}>{h}:00</Mono>
                          {e.tag === 'diamond' && <Mono style={{ fontSize: 9, color: 'var(--paper)' }}>◆</Mono>}
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.15, marginTop: 2 }}>{e.t}</div>
                        {e.h >= 1 && <Mono style={{ fontSize: 9, color: e.tag === 'diamond' ? 'var(--paper-3)' : 'var(--ink-low)' }}>{e.sl}</Mono>}
                      </div>
                    ))}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Detail rail */}
        <aside style={{ flex: '0 0 320px', borderLeft: '1px solid var(--line)', padding: 20, background: 'var(--paper-2)', overflow: 'auto' }}>
          <Label>selecionada</Label>
          <Hand style={{ display: 'block', fontSize: 22, marginTop: 4 }}>Mariana Kawai</Hand>
          <Mono style={{ color: 'var(--ink-mid)' }}>Qua 14 · 10:00 – 11:30</Mono>

          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <Pill tone="gold">Gold</Pill>
            <Pill>30min</Pill>
            <Pill>Vídeo</Pill>
          </div>

          <Hr soft />

          <Label>lead</Label>
          <Box style={{ padding: 12, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Av letter="M" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Mariana Kawai</div>
                <Mono style={{ color: 'var(--ink-low)' }}>mariana@brava.io</Mono>
              </div>
            </div>
            <Hr soft />
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 6, fontSize: 12 }}>
              <Mono style={{ color: 'var(--ink-mid)' }}>empresa</Mono><span>Brava</span>
              <Mono style={{ color: 'var(--ink-mid)' }}>cargo</Mono><span>Head Vendas</span>
              <Mono style={{ color: 'var(--ink-mid)' }}>SDRs</Mono><span>11 – 25</span>
              <Mono style={{ color: 'var(--ink-mid)' }}>fonte</Mono><span>LinkedIn ads</span>
              <Mono style={{ color: 'var(--ink-mid)' }}>score</Mono><Mono>87 / 100</Mono>
            </div>
          </Box>

          <Hr soft />
          <Label>respostas do funil</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {[
              ['Por que TypeCall?', 'Reduzir no-show e tempo do SDR'],
              ['Budget mensal', 'R$ 5–10k'],
              ['Tooling atual', 'Typeform + Calendly + manual'],
            ].map(([q, a]) => (
              <div key={q}>
                <Mono style={{ color: 'var(--ink-mid)' }}>{q}</Mono>
                <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontSize: 13, lineHeight: 1.4, marginTop: 2 }}>"{a}"</p>
              </div>
            ))}
          </div>

          <Hr soft />
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn size="sm" tone="primary" style={{ flex: 1 }}>Abrir lead</Btn>
            <Btn size="sm">Remarcar</Btn>
            <Btn size="sm" tone="ghost">⋯</Btn>
          </div>
        </aside>
      </div>
    </AppFrame>
  );
}

function CalendarPipeline() {
  // Variation B — Pipeline / Kanban of bookings
  const columns = [
    { name: 'Hoje', sub: '6 reuniões', items: [
      { t: '09:30', n: 'Lucas Pereira', co: 'Stein Co', tag: 'gold', sl: 'Bianca', score: 72 },
      { t: '11:00', n: 'Tatiana V. Boas', co: 'Acme', tag: 'diamond', sl: 'Diego', score: 91, hot: true },
      { t: '14:00', n: 'Rômulo Sá', co: 'Praxedes', tag: 'silver', sl: 'Bianca', score: 58 },
      { t: '15:30', n: 'Mariana K.', co: 'Brava', tag: 'gold', sl: 'Rafael', score: 87 },
    ]},
    { name: 'Amanhã', sub: '4 reuniões', items: [
      { t: '09:00', n: 'Pedro Cunha', co: 'Cunha Adv.', tag: 'gold', sl: 'Bianca', score: 81 },
      { t: '11:30', n: 'Karen Lebon', co: 'Lebon Co', tag: 'silver', sl: 'Diego', score: 49 },
      { t: '15:00', n: 'Vitor B. P.', co: 'BVP Tech', tag: 'diamond', sl: 'Rafael', score: 94, hot: true },
    ]},
    { name: 'Esta semana', sub: '12 reuniões', items: [
      { t: 'Qui 09:30', n: 'Eduardo F.', co: 'EFB Soft', tag: 'gold', sl: 'Diego', score: 76 },
      { t: 'Qui 14:00', n: 'Pestillo MEI', co: 'Pestillo', tag: 'bronze', sl: 'Cláudia', score: 32 },
      { t: 'Sex 10:00', n: 'Toledo S.A.', co: 'Toledo', tag: 'bronze', sl: 'Bianca', score: 41 },
      { t: 'Sex 16:30', n: 'Sara Nasser', co: 'Nasser Tax', tag: 'silver', sl: 'Diego', score: 64 },
    ]},
    { name: 'Pendente confirmação', sub: '5 leads · ⚠', items: [
      { t: 'Seg 11:00', n: 'Caio Drummond', co: 'CD Group', tag: 'gold', sl: 'Bianca', score: 79, warn: 'sem confirmar' },
      { t: 'Ter 09:30', n: 'Iara Bicalho', co: 'Bicalho ME', tag: 'silver', sl: 'Diego', score: 56, warn: 'não respondeu' },
    ]},
  ];

  return (
    <AppFrame
      active="bookings"
      title="Pipeline de reuniões"
      crumbs={["Acme Vendas"]}
      headerRight={
        <>
          <div className="wf-input" style={{ padding: '6px 10px' }}><Mono style={{ color: 'var(--ink-low)' }}>Vendedores · todos</Mono></div>
          <div className="wf-input" style={{ padding: '6px 10px' }}><Mono style={{ color: 'var(--ink-low)' }}>Tag · todas</Mono></div>
          <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 3 }}>
            {['Semana', 'Pipeline', 'Lista'].map((t, i) => (
              <span key={t} style={{ padding: '6px 10px', borderRight: i < 2 ? '1px solid var(--line)' : 'none', fontSize: 12, background: i === 1 ? 'var(--ink)' : 'transparent', color: i === 1 ? 'var(--paper)' : 'var(--ink)' }}>{t}</span>
            ))}
          </div>
        </>
      }
    >
      <div style={{ height: '100%', overflow: 'auto', padding: '20px 24px', display: 'flex', gap: 14 }}>
        {columns.map(col => (
          <div key={col.name} style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px' }}>
              <div>
                <Hand style={{ fontSize: 16 }}>{col.name}</Hand>
                <Mono style={{ color: 'var(--ink-low)', marginLeft: 0 }}>{col.sub}</Mono>
              </div>
              <Mono style={{ color: 'var(--ink-mid)' }}>＋</Mono>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.items.map((it, i) => (
                <Box key={i} style={{ padding: 12, background: it.hot ? 'var(--paper)' : 'var(--paper)', borderColor: it.hot ? 'var(--ink)' : 'var(--line)', boxShadow: it.hot ? 'inset 0 0 0 1px var(--ink)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Mono>{it.t}</Mono>
                    <Pill tone={it.tag === 'diamond' ? 'accent' : it.tag === 'gold' ? 'gold' : 'default'} style={{ fontSize: 10 }}>
                      {it.tag.toUpperCase()}
                    </Pill>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{it.n}</div>
                    <Mono style={{ color: 'var(--ink-low)' }}>{it.co}</Mono>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Av letter={it.sl[0]} size="sm" />
                      <Mono style={{ color: 'var(--ink-mid)' }}>{it.sl}</Mono>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 40, height: 4, background: 'var(--paper-3)', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, width: `${it.score}%`, background: 'var(--ink)' }} />
                      </div>
                      <Mono>{it.score}</Mono>
                    </div>
                  </div>
                  {it.warn && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 8px', border: '1px dashed var(--bad)', background: 'var(--paper-2)' }}>
                      <Mono style={{ color: 'var(--bad)' }}>⚠ {it.warn}</Mono>
                    </div>
                  )}
                </Box>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppFrame>
  );
}

Object.assign(window, { CalendarWeek, CalendarPipeline });
