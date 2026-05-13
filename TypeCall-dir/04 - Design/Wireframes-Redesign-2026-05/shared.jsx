// Shared wireframe primitives for TypeCall — premium B2B redesign.
// Aesthetic: warm cream paper, ink near-black, hairlines, monospace labels,
// Source Serif for display, restrained gold accents (used very sparingly in wireframes).

const { useState } = React;

// ---------- atoms ----------
function Mono({ children, className = '', style = {} }) {
  return (
    <span className={`wf-mono ${className}`} style={style}>
      {children}
    </span>
  );
}

function Label({ children, className = '', style = {} }) {
  return (
    <span className={`wf-label ${className}`} style={style}>
      {children}
    </span>
  );
}

function Hand({ children, className = '', style = {} }) {
  return (
    <span className={`wf-hand ${className}`} style={style}>
      {children}
    </span>
  );
}

function Ph({ w, h, text, dashed = false, img = false, style = {} }) {
  return (
    <div
      className={`wf-ph ${dashed ? 'wf-dashed' : ''} ${img ? 'wf-img' : ''}`}
      style={{ width: w, height: h, ...style }}
    >
      {text}
    </div>
  );
}

function Pill({ children, tone = 'default', className = '', style = {} }) {
  const toneCls = tone === 'accent' ? 'wf-accent' : tone === 'gold' ? 'wf-gold' : tone === 'ghost' ? 'wf-ghost' : '';
  return (
    <span className={`wf-pill ${toneCls} ${className}`} style={style}>
      {children}
    </span>
  );
}

function Btn({ children, tone = 'default', size = 'md', className = '', style = {} }) {
  const toneCls = tone === 'primary' ? 'wf-primary' : tone === 'gold' ? 'wf-gold' : tone === 'ghost' ? 'wf-ghost' : '';
  const sizeCls = size === 'sm' ? 'wf-sm' : '';
  return (
    <button className={`wf-btn ${toneCls} ${sizeCls} ${className}`} style={style}>
      {children}
    </button>
  );
}

function Input({ placeholder, value, w = '100%', style = {}, prefix }) {
  return (
    <div className="wf-input" style={{ width: w, ...style }}>
      {prefix && <Mono style={{ color: 'var(--ink-low)' }}>{prefix}</Mono>}
      <span style={{ color: value ? 'var(--ink)' : 'var(--ink-low)' }}>{value || placeholder}</span>
    </div>
  );
}

function Hr({ soft = false, style = {} }) {
  return <hr className={`wf-hr ${soft ? 'wf-soft' : ''}`} style={style} />;
}

function Av({ letter, size = 'md', style = {} }) {
  const sz = size === 'sm' ? 'wf-sm' : size === 'lg' ? 'wf-lg' : size === 'xl' ? 'wf-xl' : '';
  return (
    <div className={`wf-av ${sz}`} style={style}>
      {letter}
    </div>
  );
}

function Box({ children, soft = false, className = '', style = {} }) {
  return (
    <div className={`wf-box ${soft ? 'wf-soft' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}

function Bar({ pct = 50, style = {} }) {
  return (
    <div className="wf-bar" style={style}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---------- Sidebar (TypeCall app chrome) ----------
function Sidebar({ active = 'dashboard', collapsed = false }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'forms', label: 'Funis' },
    { id: 'bookings', label: 'Reuniões' },
    { id: 'sellers', label: 'Vendedores' },
    { id: 'kanban', label: 'Pipeline' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Configurações' },
  ];
  const w = collapsed ? 60 : 220;
  return (
    <aside style={{
      width: w, flex: `0 0 ${w}px`, borderRight: '1px solid var(--line)',
      background: 'var(--paper-2)', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 14
    }}>
      {/* logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 10px', borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{ width: 22, height: 22, border: '1px solid var(--ink)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Hand style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>T</Hand>
        </div>
        {!collapsed && <Hand style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.018em' }}>TypeCall</Hand>}
      </div>

      {!collapsed && <Label style={{ paddingLeft: 8 }}>Workspace</Label>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(it => (
          <div key={it.id} className={`wf-nav-item ${active === it.id ? 'wf-on' : ''}`} style={collapsed ? { justifyContent: 'center' } : {}}>
            <span className="wf-ic" />
            {!collapsed && <span>{it.label}</span>}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line-soft)', paddingTop: 10 }}>
        {!collapsed && (
          <>
            <Label>Org</Label>
            <Box style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Av letter="A" size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Acme Vendas</div>
                <Mono style={{ color: 'var(--ink-low)' }}>FREE · 14d</Mono>
              </div>
            </Box>
          </>
        )}
      </div>
    </aside>
  );
}

// ---------- Top bar inside the app ----------
function TopBar({ title, crumbs = [], right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px', borderBottom: '1px solid var(--line)', background: 'var(--paper)',
      gap: 16
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        {crumbs.length > 0 && (
          <>
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                <Mono style={{ color: 'var(--ink-low)' }}>{c}</Mono>
                <Mono style={{ color: 'var(--ink-low)' }}>/</Mono>
              </React.Fragment>
            ))}
          </>
        )}
        <Hand style={{ fontSize: 20, fontWeight: 500 }}>{title}</Hand>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
      </div>
    </div>
  );
}

// ---------- App frame ----------
function AppFrame({ active, title, crumbs, headerRight, children, sidebar = true }) {
  return (
    <div className="wf" style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
      {sidebar && <Sidebar active={active} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--paper)' }}>
        {title && <TopBar title={title} crumbs={crumbs} right={headerRight} />}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------- Browser chrome (for landing pages, public forms) ----------
function Chrome({ url = 'typecall.io', children, style = {} }) {
  return (
    <div className="wf" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', ...style }}>
      <div className="wf-chrome">
        <div className="wf-dots"><i /><i /><i /></div>
        <div className="wf-url">https://{url}</div>
        <Mono style={{ color: 'var(--ink-low)' }}>WIRE</Mono>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--paper)' }}>
        {children}
      </div>
    </div>
  );
}

// ---------- Note (margin annotation) ----------
function Note({ children, style = {} }) {
  return <div className="wf-note" style={style}>{children}</div>;
}

// ---------- Section header (in canvas) ----------
function ScreenSectionTitle({ idx, title, summary }) {
  return (
    <div style={{ fontFamily: 'Geist, sans-serif', display: 'flex', alignItems: 'baseline', gap: 16 }}>
      <Mono style={{ color: 'var(--ink-low)' }}>{idx}</Mono>
      <Hand style={{ fontSize: 22, fontWeight: 500 }}>{title}</Hand>
      <span style={{ fontSize: 13, color: 'var(--ink-mid)', fontFamily: 'Geist, sans-serif' }}>{summary}</span>
    </div>
  );
}

Object.assign(window, {
  Mono, Label, Hand, Ph, Pill, Btn, Input, Hr, Av, Box, Bar,
  Sidebar, TopBar, AppFrame, Chrome, Note, ScreenSectionTitle,
});
