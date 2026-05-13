// Settings / Integrations wireframes
// Variation A — Tabbed settings hub with integration cards grid
// Variation B — Single-page list with integration status, organized by category

function SettingsHub() {
  return (
    <AppFrame
      active="settings"
      title="Configurações"
      crumbs={["Acme Vendas"]}
    >
      <div style={{ display: 'flex', height: '100%' }}>
        {/* secondary nav */}
        <aside style={{ flex: '0 0 220px', borderRight: '1px solid var(--line)', padding: '24px 16px', background: 'var(--paper-2)' }}>
          <Label>Workspace</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 10 }}>
            {[
              ['Geral', false],
              ['Branding', false],
              ['Times & Permissões', false],
              ['Integrações', true],
              ['Webhooks', false],
              ['API & Tokens', false],
              ['Faturamento', false],
              ['Auditoria', false],
            ].map(([n, on]) => (
              <div key={n} style={{
                padding: '7px 10px', fontSize: 13, borderRadius: 3,
                background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--paper)' : 'var(--ink-soft)',
              }}>{n}</div>
            ))}
          </div>
        </aside>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <Hand style={{ fontSize: 26 }}>Integrações</Hand>
            <Btn size="sm">＋ Solicitar nova</Btn>
          </div>
          <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontSize: 14.5, color: 'var(--ink-soft)', maxWidth: 600 }}>
            Conecte TypeCall ao stack que você já usa. Toda integração é configurada uma vez e funciona para todos os funis.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22 }}>
            {['Todas', 'Conectadas (4)', 'Calendário', 'CRM', 'Comunicação', 'Marketing'].map((t, i) => (
              <span key={t} style={{
                padding: '5px 12px', border: '1px solid ' + (i === 0 ? 'var(--ink)' : 'var(--line)'),
                background: i === 0 ? 'var(--ink)' : 'transparent', color: i === 0 ? 'var(--paper)' : 'var(--ink)',
                fontSize: 12, borderRadius: 99,
              }}>{t}</span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 22 }}>
            {[
              { n: 'Google Calendar', g: 'Calendário', on: true, sub: '4 calendários sincronizados' },
              { n: 'Microsoft Outlook', g: 'Calendário', on: false },
              { n: 'Apple iCloud', g: 'Calendário', on: false, lbl: 'beta' },
              { n: 'Salesforce', g: 'CRM', on: true, sub: 'mapeado para Lead' },
              { n: 'HubSpot', g: 'CRM', on: false },
              { n: 'Pipedrive', g: 'CRM', on: true, sub: 'webhook · Deal' },
              { n: 'Slack', g: 'Comunicação', on: true, sub: '#vendas-acme' },
              { n: 'WhatsApp Business', g: 'Comunicação', on: false, lbl: 'beta' },
              { n: 'Zoom', g: 'Comunicação', on: false },
              { n: 'Meta / Facebook Pixel', g: 'Marketing', on: false },
              { n: 'Google Ads', g: 'Marketing', on: false },
              { n: 'Asaas', g: 'Pagamento', on: true, sub: 'cobrança automática' },
            ].map((it, i) => (
              <Box key={i} style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ width: 36, height: 36, border: '1px solid var(--line)', borderRadius: 3, background: 'var(--paper-2)' }} />
                  {it.on
                    ? <Pill style={{ color: 'var(--good)', borderColor: 'var(--good)' }}>● conectado</Pill>
                    : it.lbl
                      ? <Pill tone="gold">{it.lbl}</Pill>
                      : <Pill tone="ghost">conectar</Pill>}
                </div>
                <Hand style={{ display: 'block', fontSize: 16, marginTop: 12 }}>{it.n}</Hand>
                <Mono style={{ color: 'var(--ink-mid)' }}>{it.g}</Mono>
                {it.sub && (
                  <div style={{ marginTop: 10, padding: '6px 8px', background: 'var(--paper-2)', borderRadius: 3, border: '1px solid var(--line-soft)' }}>
                    <Mono style={{ color: 'var(--ink-mid)' }}>{it.sub}</Mono>
                  </div>
                )}
              </Box>
            ))}
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

function SettingsIntegrationDetail() {
  // Variation B — Drilled-in view for a single integration (Salesforce field mapping)
  return (
    <AppFrame
      active="settings"
      title="Salesforce"
      crumbs={["Configurações", "Integrações"]}
      headerRight={
        <>
          <Pill style={{ color: 'var(--good)', borderColor: 'var(--good)' }}>● conectado · há 14d</Pill>
          <Btn size="sm">Testar sincronização</Btn>
          <Btn size="sm" tone="ghost">⋯</Btn>
        </>
      }
    >
      <div style={{ height: '100%', overflow: 'auto', padding: '24px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Sync rules */}
            <Box style={{ padding: 20 }}>
              <Label>regras de sincronização</Label>
              <Hand style={{ display: 'block', fontSize: 18, marginTop: 4 }}>Quando enviar leads</Hand>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {[
                  { cond: 'Tag = Diamond OR Gold', target: 'Lead → Hot Pipeline', on: true },
                  { cond: 'Tag = Silver', target: 'Lead → Nurture', on: true },
                  { cond: 'Tag = Bronze', target: 'Lead → Marketing list', on: true },
                  { cond: 'Tag = Disqualified', target: 'Não enviar', on: false },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 16px 1fr 40px', gap: 12, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 3 }}>
                    <div>
                      <Mono style={{ color: 'var(--ink-mid)' }}>se</Mono>
                      <div style={{ fontSize: 13, marginTop: 2 }}>{r.cond}</div>
                    </div>
                    <Mono style={{ color: 'var(--ink-mid)', textAlign: 'center' }}>→</Mono>
                    <div>
                      <Mono style={{ color: 'var(--ink-mid)' }}>então</Mono>
                      <div style={{ fontSize: 13, marginTop: 2 }}>{r.target}</div>
                    </div>
                    <div style={{ width: 28, height: 16, background: r.on ? 'var(--ink)' : 'var(--paper-3)', border: r.on ? 'none' : '1px solid var(--line)', borderRadius: 99, position: 'relative', marginLeft: 'auto' }}>
                      <div style={{ position: 'absolute', top: 1, [r.on ? 'right' : 'left']: 2, width: 12, height: 12, background: 'var(--paper)', borderRadius: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>
              <Btn size="sm" tone="ghost" style={{ marginTop: 12 }}>＋ adicionar regra</Btn>
            </Box>

            {/* Field mapping */}
            <Box style={{ padding: 20 }}>
              <Label>mapeamento de campos</Label>
              <Hand style={{ display: 'block', fontSize: 18, marginTop: 4 }}>TypeCall → Salesforce</Hand>

              <table style={{ width: '100%', marginTop: 14, fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Campo TypeCall', '', 'Campo Salesforce', 'Tipo'].map((h, i) => (
                      <th key={i} style={{ textAlign: 'left', padding: '8px 0', fontFamily: 'Geist Mono', fontSize: 10.5, color: 'var(--ink-mid)', textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['email', 'Email', 'string'],
                    ['nome', 'FirstName + LastName', 'string'],
                    ['empresa', 'Company', 'string'],
                    ['cargo', 'Title', 'string'],
                    ['score', 'TypeCall_Score__c', 'number · custom'],
                    ['tag', 'Lead_Tier__c', 'picklist · custom'],
                    ['utm_source', 'LeadSource', 'string'],
                  ].map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                      <td style={{ padding: '10px 0', fontFamily: 'Geist Mono', fontSize: 12 }}>{row[0]}</td>
                      <td><Mono style={{ color: 'var(--ink-mid)' }}>→</Mono></td>
                      <td style={{ fontFamily: 'Geist Mono', fontSize: 12 }}>{row[1]}</td>
                      <td><Mono style={{ color: 'var(--ink-low)' }}>{row[2]}</Mono></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Btn size="sm" tone="ghost" style={{ marginTop: 12 }}>＋ mapear campo customizado</Btn>
            </Box>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Box style={{ padding: 18 }}>
              <Label>estatísticas</Label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div>
                  <Hand style={{ fontSize: 28 }}>1.842</Hand>
                  <Mono style={{ color: 'var(--ink-mid)' }}>leads sync · 30d</Mono>
                </div>
                <div>
                  <Hand style={{ fontSize: 28 }}>99,4%</Hand>
                  <Mono style={{ color: 'var(--ink-mid)' }}>taxa de sucesso</Mono>
                </div>
                <div>
                  <Hand style={{ fontSize: 28 }}>11</Hand>
                  <Mono style={{ color: 'var(--ink-mid)' }}>falhas (retry)</Mono>
                </div>
                <div>
                  <Hand style={{ fontSize: 28 }}>1,8s</Hand>
                  <Mono style={{ color: 'var(--ink-mid)' }}>latência média</Mono>
                </div>
              </div>
            </Box>

            <Box style={{ padding: 18 }}>
              <Label>atividade recente</Label>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
                {[
                  { t: '2m atrás', a: 'Lead criado · mariana@brava.io', ok: true },
                  { t: '14m', a: 'Lead criado · pedro@cunha.adv', ok: true },
                  { t: '32m', a: 'Falha · Lead_Tier__c inválido', ok: false },
                  { t: '1h', a: 'Lead atualizado · romulo@praxedes', ok: true },
                  { t: '2h', a: 'Webhook entregue · 200', ok: true },
                ].map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: e.ok ? 'var(--good)' : 'var(--bad)' }} />
                    <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.a}</span>
                    <Mono style={{ color: 'var(--ink-low)' }}>{e.t}</Mono>
                  </div>
                ))}
              </div>
              <Btn size="sm" tone="ghost" style={{ marginTop: 10 }}>ver log completo →</Btn>
            </Box>

            <Box style={{ padding: 18, background: 'var(--paper-2)' }}>
              <Label style={{ color: 'var(--gold-dk)' }}>aviso</Label>
              <p style={{ fontFamily: 'Source Serif 4, Georgia, serif', fontSize: 13, lineHeight: 1.45, marginTop: 6, color: 'var(--ink)' }}>
                Toke OAuth expira em <strong>16 dias</strong>. Renove para evitar interrupção.
              </p>
              <Btn size="sm" style={{ marginTop: 10 }}>Renovar token</Btn>
            </Box>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

Object.assign(window, { SettingsHub, SettingsIntegrationDetail });
