// Form Builder wireframes
// Variation A — Classic 3-pane (palette / canvas linear list / properties) — close to current
// Variation B — Node-graph editor with conditional branches as a flow

function BuilderClassic() {
  return (
    <AppFrame
      active="forms"
      sidebar={false}
    >
      {/* custom header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Mono style={{ color: 'var(--ink-mid)' }}>← Funis</Mono>
          <div style={{ width: 1, height: 16, background: 'var(--line)' }} />
          <div style={{ width: 20, height: 20, border: '1px solid var(--ink)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Hand style={{ fontSize: 11 }}>T</Hand>
          </div>
          <Hand style={{ fontSize: 14 }}>Demo Enterprise</Hand>
          <Pill>rascunho</Pill>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mono style={{ color: 'var(--ink-mid)' }}>● salvo · há 2s</Mono>
          <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 3 }}>
            {['Blocos', 'Lógica', 'Tema', 'Compartilhar'].map((t, i) => (
              <span key={t} style={{ padding: '6px 10px', borderRight: i < 3 ? '1px solid var(--line)' : 'none', fontSize: 12, background: i === 0 ? 'var(--ink)' : 'transparent', color: i === 0 ? 'var(--paper)' : 'var(--ink)' }}>{t}</span>
            ))}
          </div>
          <Btn size="sm">▷ Preview</Btn>
          <Btn size="sm" tone="primary">Publicar</Btn>
        </div>
      </div>

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Palette */}
        <aside style={{ flex: '0 0 220px', borderRight: '1px solid var(--line)', background: 'var(--paper-2)', padding: 16, overflow: 'auto' }}>
          <Label>Blocos</Label>
          <div style={{ marginTop: 12 }}>
            {[
              ['Entrada', ['Texto curto', 'Email', 'Telefone', 'Número']],
              ['Escolha', ['Múltipla escolha', 'Checkbox', 'Dropdown', 'NPS']],
              ['Sales', ['Qualificação', 'Prova social', 'Vídeo alinhamento']],
              ['Especial', ['Agendamento', 'Informativo', 'Encerramento']],
            ].map(([group, blocks]) => (
              <div key={group} style={{ marginBottom: 16 }}>
                <Mono style={{ color: 'var(--ink-mid)' }}>{group}</Mono>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                  {blocks.map(b => (
                    <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid var(--line-soft)', borderRadius: 3, background: 'var(--paper)', fontSize: 12 }}>
                      <span style={{ width: 14, height: 14, border: '1px solid var(--ink-mid)', borderRadius: 2 }} />
                      <span>{b}</span>
                      <Mono style={{ marginLeft: 'auto', color: 'var(--ink-low)' }}>⋮⋮</Mono>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 24px', background: 'var(--paper)' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <Mono style={{ color: 'var(--ink-mid)' }}>fluxo · 7 etapas</Mono>
              <Mono style={{ color: 'var(--ink-low)' }}>tempo médio: 1m 42s</Mono>
            </div>

            {[
              { n: 1, t: 'Boas-vindas', s: 'Statement', icon: '★' },
              { n: 2, t: 'Qual o seu nome?', s: 'Short text' },
              { n: 3, t: 'Quantos SDRs no time?', s: 'Multiple choice · Qualificação' },
              { n: 4, t: 'Seu email corporativo', s: 'Email', sel: true },
              { n: 5, t: 'Telefone (WhatsApp)', s: 'Phone' },
              { n: 6, t: 'Escolha um horário', s: 'Agendamento' },
              { n: 7, t: 'Obrigado! Falamos em breve.', s: 'Encerramento' },
            ].map(node => (
              <div key={node.n} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', marginBottom: 6, background: 'var(--paper)',
                border: '1px solid ' + (node.sel ? 'var(--ink)' : 'var(--line)'),
                borderRadius: 3,
                boxShadow: node.sel ? 'inset 0 0 0 1px var(--ink)' : 'none',
              }}>
                <Mono style={{ color: 'var(--ink-low)' }}>⋮⋮</Mono>
                <div style={{ width: 22, height: 22, borderRadius: 3, background: node.sel ? 'var(--ink)' : 'var(--paper-2)', color: node.sel ? 'var(--paper)' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist Mono', fontSize: 10 }}>{String(node.n).padStart(2, '0')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{node.t}</div>
                  <Mono style={{ color: 'var(--ink-low)' }}>{node.s}</Mono>
                </div>
                <Mono style={{ color: 'var(--ink-low)' }}>⌥</Mono>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
              <Btn tone="ghost" size="sm">＋ adicionar bloco</Btn>
            </div>
          </div>
        </div>

        {/* Properties */}
        <aside style={{ flex: '0 0 300px', borderLeft: '1px solid var(--line)', padding: 18, overflow: 'auto', background: 'var(--paper-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Label>Bloco 04</Label>
            <Mono style={{ color: 'var(--ink-low)' }}>email</Mono>
          </div>
          <Hand style={{ display: 'block', fontSize: 17, marginTop: 4 }}>Propriedades</Hand>

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <Label style={{ display: 'block', marginBottom: 6 }}>Pergunta</Label>
              <Input value="Seu email corporativo" />
            </div>
            <div>
              <Label style={{ display: 'block', marginBottom: 6 }}>Descrição</Label>
              <div className="wf-input" style={{ height: 60, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--ink-low)', fontSize: 12 }}>Vamos enviar a confirmação por aqui.</span>
              </div>
            </div>
            <div>
              <Label style={{ display: 'block', marginBottom: 6 }}>Placeholder</Label>
              <Input placeholder="voce@empresa.com" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line-soft)' }}>
              <span style={{ fontSize: 12 }}>Obrigatório</span>
              <div style={{ width: 28, height: 16, background: 'var(--ink)', borderRadius: 99, position: 'relative' }}>
                <div style={{ position: 'absolute', right: 2, top: 2, width: 12, height: 12, background: 'var(--paper)', borderRadius: '50%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12 }}>Bloquear emails @gmail</span>
              <div style={{ width: 28, height: 16, background: 'var(--paper-3)', border: '1px solid var(--line)', borderRadius: 99, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 2, top: 1, width: 12, height: 12, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '50%' }} />
              </div>
            </div>

            <Hr soft />

            <Label>Lógica condicional</Label>
            <Box style={{ padding: 10, background: 'var(--paper)', borderStyle: 'dashed' }}>
              <Mono style={{ color: 'var(--ink-mid)' }}>se o email for de domínio livre</Mono>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 12 }}>↳ ir para</span>
                <Pill>encerramento alt.</Pill>
              </div>
            </Box>
            <Btn size="sm" tone="ghost">＋ adicionar regra</Btn>
          </div>
        </aside>
      </div>
    </AppFrame>
  );
}

function BuilderNodeGraph() {
  // Variation B — visual flow editor: nodes with branches
  const nodes = [
    { id: 'start', x: 40, y: 240, t: 'Boas-vindas', sub: 'statement', shape: 'pill' },
    { id: 'q1', x: 220, y: 240, t: 'Cargo', sub: 'múltipla escolha' },
    { id: 'q2a', x: 420, y: 140, t: 'Tamanho do time', sub: 'múltipla · branch A' },
    { id: 'q2b', x: 420, y: 340, t: 'Faturamento mensal', sub: 'múltipla · branch B' },
    { id: 'email', x: 620, y: 240, t: 'Email corporativo', sub: 'email · validar' },
    { id: 'cal', x: 820, y: 140, t: 'Agendar reunião', sub: 'calendário · 30min' },
    { id: 'dq', x: 820, y: 340, t: 'Desqualificado', sub: 'ending alt.', shape: 'end' },
    { id: 'end', x: 1020, y: 140, t: 'Confirmado', sub: 'ending', shape: 'end' },
  ];
  const edges = [
    ['start', 'q1'],
    ['q1', 'q2a', 'C-level / Head'],
    ['q1', 'q2b', 'Analista / outro'],
    ['q2a', 'email'],
    ['q2b', 'email'],
    ['email', 'cal', 'qualificado'],
    ['email', 'dq', '@gmail / @hotmail'],
    ['cal', 'end'],
  ];
  const nbyId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const nodeW = 152, nodeH = 64;

  return (
    <AppFrame active="forms" sidebar={false}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Mono style={{ color: 'var(--ink-mid)' }}>← Funis</Mono>
          <div style={{ width: 1, height: 16, background: 'var(--line)' }} />
          <Hand style={{ fontSize: 14 }}>Demo Enterprise</Hand>
          <Pill tone="gold">8 nós · 2 branches</Pill>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 3 }}>
            {['Lista', 'Fluxo', 'Tema'].map((t, i) => (
              <span key={t} style={{ padding: '6px 12px', borderRight: i < 2 ? '1px solid var(--line)' : 'none', fontSize: 12, background: i === 1 ? 'var(--ink)' : 'transparent', color: i === 1 ? 'var(--paper)' : 'var(--ink)' }}>{t}</span>
            ))}
          </div>
          <Btn size="sm">▷ Preview</Btn>
          <Btn size="sm" tone="primary">Publicar</Btn>
        </div>
      </div>

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Slim palette */}
        <aside style={{ flex: '0 0 60px', borderRight: '1px solid var(--line)', background: 'var(--paper-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 6 }}>
          {['T', '☐', '✉', '#', '★', '◐', '◑', '◇', '⌘'].map((s, i) => (
            <div key={i} style={{ width: 36, height: 36, border: '1px solid ' + (i === 3 ? 'var(--ink)' : 'var(--line-soft)'), background: i === 3 ? 'var(--ink)' : 'var(--paper)', color: i === 3 ? 'var(--paper)' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist Mono', fontSize: 13, borderRadius: 3 }}>{s}</div>
          ))}
        </aside>

        {/* Graph */}
        <div style={{ flex: 1, position: 'relative', background: 'var(--paper)', backgroundImage: 'radial-gradient(circle, var(--line-faint) 1px, transparent 1px)', backgroundSize: '18px 18px', overflow: 'hidden' }}>
          {/* mini-map and controls */}
          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6 }}>
            <Pill>fit</Pill>
            <Pill>−</Pill>
            <Pill>＋</Pill>
            <Pill tone="ghost">100%</Pill>
          </div>
          <div style={{ position: 'absolute', bottom: 14, right: 14, width: 180, height: 110, border: '1px solid var(--line)', background: 'var(--paper-2)', padding: 6 }}>
            <Mono style={{ color: 'var(--ink-low)', fontSize: 9 }}>MINIMAP</Mono>
          </div>

          <svg width="100%" height="100%" viewBox="0 0 1200 500" preserveAspectRatio="xMinYMin meet" style={{ display: 'block' }}>
            {/* edges */}
            {edges.map(([a, b, label], i) => {
              const A = nbyId[a], B = nbyId[b];
              const x1 = A.x + nodeW, y1 = A.y + nodeH / 2;
              const x2 = B.x, y2 = B.y + nodeH / 2;
              const mx = (x1 + x2) / 2;
              const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
              return (
                <g key={i}>
                  <path d={path} stroke="var(--ink-soft)" strokeWidth="1.2" fill="none" />
                  <polygon points={`${x2},${y2} ${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4}`} fill="var(--ink-soft)" />
                  {label && (
                    <g>
                      <rect x={mx - 38} y={y1 + (y2 - y1) / 2 - 9} width="76" height="16" fill="var(--paper)" stroke="var(--line)" />
                      <text x={mx} y={y1 + (y2 - y1) / 2 + 2} textAnchor="middle" fill="var(--ink-soft)" fontFamily="Geist Mono" fontSize="9">{label}</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* nodes */}
            {nodes.map(n => {
              const isEnd = n.shape === 'end';
              return (
                <g key={n.id}>
                  <rect x={n.x} y={n.y} width={nodeW} height={nodeH}
                    fill="var(--paper)" stroke="var(--ink)" strokeWidth={n.id === 'email' ? 1.5 : 1}
                    rx={n.shape === 'pill' ? 32 : 3} />
                  {n.id === 'email' && <rect x={n.x - 4} y={n.y - 4} width={nodeW + 8} height={nodeH + 8} fill="none" stroke="var(--gold)" strokeDasharray="3 3" rx="6" />}
                  <text x={n.x + 12} y={n.y + 22} fontFamily="Geist Mono" fontSize="9" fill="var(--ink-low)" textTransform="uppercase">
                    {String(nodes.indexOf(n) + 1).padStart(2, '0')} · {isEnd ? 'END' : 'BLOCK'}
                  </text>
                  <text x={n.x + 12} y={n.y + 40} fontFamily="Geist, sans-serif" fontSize="12" fontWeight="500" fill="var(--ink)">{n.t}</text>
                  <text x={n.x + 12} y={n.y + 56} fontFamily="Geist Mono" fontSize="9" fill="var(--ink-mid)">{n.sub}</text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* right inspector */}
        <aside style={{ flex: '0 0 280px', borderLeft: '1px solid var(--line)', padding: 18, overflow: 'auto', background: 'var(--paper-2)' }}>
          <Label>nó selecionado</Label>
          <Hand style={{ display: 'block', fontSize: 17, marginTop: 4 }}>Email corporativo</Hand>
          <Mono style={{ color: 'var(--ink-mid)' }}>email · validar domínio</Mono>

          <Hr soft />

          <Label>regras de saída</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            <Box style={{ padding: 10 }}>
              <Mono style={{ color: 'var(--good)' }}>● if @empresa.com</Mono>
              <div style={{ fontSize: 12, marginTop: 4 }}>↳ Agendar reunião</div>
            </Box>
            <Box style={{ padding: 10 }}>
              <Mono style={{ color: 'var(--bad)' }}>● if email livre</Mono>
              <div style={{ fontSize: 12, marginTop: 4 }}>↳ Desqualificado</div>
            </Box>
            <Btn size="sm" tone="ghost">＋ adicionar regra</Btn>
          </div>

          <Hr soft />
          <Label>variáveis disponíveis</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {['{{nome}}', '{{cargo}}', '{{empresa}}', '{{tamanho_time}}', '{{score}}'].map(v => (
              <Pill key={v} className="wf-mono" style={{ fontFamily: 'Geist Mono', fontSize: 10 }}>{v}</Pill>
            ))}
          </div>
        </aside>
      </div>
    </AppFrame>
  );
}

Object.assign(window, { BuilderClassic, BuilderNodeGraph });
