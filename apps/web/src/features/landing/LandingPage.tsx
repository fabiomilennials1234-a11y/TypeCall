import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { listContainerVariants, listItemVariants } from '@/lib/staggerList'

const STATS: Array<[string, string]> = [
  ['41%', 'reducao de no-show'],
  ['3,2×', 'mais leads qualificados / SDR'],
  ['90s', 'tempo medio do funil'],
  ['1d', 'setup completo'],
]

const PILLARS: Array<{ num: string; tag: string; title: string; body: string }> = [
  {
    num: '01',
    tag: 'Builder',
    title: 'Funil conversacional',
    body: 'Lead responde uma pergunta por tela. Score, tag e desqualificacao automaticos.',
  },
  {
    num: '02',
    tag: 'Schedule',
    title: 'Calendario fundido',
    body: 'Vendedor escolhido pela tag. Round-robin, fuso, buffer e Google/Outlook nativos.',
  },
  {
    num: '03',
    tag: 'Analytics',
    title: 'Pipeline em tempo real',
    body: 'No-show, remarcacao e receita. Envio para Salesforce, Pipedrive, Slack ou webhook.',
  },
]

const LOGOS = ['BRAVA', 'CAJU', 'ACME', 'STEIN&CO', 'KAWAI', 'NASSER', 'TOLEDO']

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <TopNav />
      <Hero />
      <NumberBand />
      <Pillars />
      <Quote />
      <CTA />
      <Footer />
    </div>
  )
}

function TopNav() {
  return (
    <header className="border-b border-line-soft">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 lg:px-12 lg:py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-ink bg-paper">
            <span className="font-display text-[15px] font-semibold leading-none">T</span>
          </div>
          <span className="font-display text-lg tracking-tight">TypeCall</span>
        </div>
        <nav className="hidden gap-6 text-[13px] text-ink-soft lg:flex">
          {['Produto', 'Para SDRs', 'Para Founders', 'Clientes', 'Preco', 'Docs'].map((n) => (
            <a key={n} href={`#${n.toLowerCase()}`} className="hover:text-ink">
              {n}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden font-mono text-[11px] uppercase tracking-wider text-ink-mid hover:text-ink sm:inline"
          >
            Entrar
          </Link>
          <Link to="/register">
            <Button size="sm">Comecar gratis →</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-16 lg:px-12 lg:py-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold-dk">
        ★ usado por 1.400+ times de pre-venda no Brasil
      </p>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="font-display mt-5 max-w-[1100px] text-[44px] leading-[0.98] tracking-[-0.025em] sm:text-6xl lg:text-[88px]"
      >
        Qualifique e <span className="tc-underline">agende</span>
        <br className="hidden sm:inline" /> no <em className="italic">mesmo</em> respiro.
      </motion.h1>
      <p className="mt-7 max-w-[720px] font-serif text-[17px] leading-relaxed text-ink-soft sm:text-[20px]">
        TypeCall substitui Typeform + Calendly por um unico fluxo conversacional. O lead se
        qualifica e cai na agenda certa do vendedor certo, em 90 segundos.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link to="/register">
          <Button size="lg" className="px-5 py-3 text-[14px]">
            Comecar gratis
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
        <Button variant="outline" size="lg" className="px-5 py-3 text-[14px]">
          <Play className="mr-1 h-4 w-4" />
          Ver demonstracao · 2min
        </Button>
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-mid">
          14d trial · sem cartao
        </span>
      </div>

      <HeroPreview />

      <div className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-3 border-t border-line-soft pt-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-mid">
          times que usam TypeCall
        </span>
        {LOGOS.map((b) => (
          <span
            key={b}
            className="font-display text-[15px] tracking-[0.06em] text-ink-mid"
          >
            {b}
          </span>
        ))}
      </div>
    </section>
  )
}

function HeroPreview() {
  return (
    <div className="mt-12 overflow-hidden rounded-sm border border-ink bg-paper-2">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full border border-line bg-paper" />
        <span className="h-2.5 w-2.5 rounded-full border border-line bg-paper" />
        <span className="h-2.5 w-2.5 rounded-full border border-line bg-paper" />
        <span className="ml-3 font-mono text-[10px] uppercase tracking-wider text-ink-low">
          app.typecall.io/dashboard
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-line">
        {[
          { label: 'Reunioes', value: '142', delta: '+18%' },
          { label: 'No-show', value: '12,4%', delta: '-3,1pp' },
          { label: 'Receita', value: 'R$ 384k', delta: '+22%' },
        ].map((k) => (
          <div key={k.label} className="bg-paper px-6 py-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mid">
              {k.label}
            </p>
            <p className="font-display mt-3 text-4xl tracking-tight sm:text-5xl">
              {k.value}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-good">
              {k.delta}
            </p>
          </div>
        ))}
      </div>
      <div className="flex h-44 items-center justify-center border-t border-line bg-paper-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-low">
          [ funnel · drop-off · pipeline ]
        </p>
      </div>
    </div>
  )
}

function NumberBand() {
  return (
    <section className="border-y border-ink bg-paper-2">
      <motion.div
        variants={listContainerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="mx-auto grid max-w-[1400px] grid-cols-2 lg:grid-cols-4"
      >
        {STATS.map(([n, l], i) => (
          <motion.div
            variants={listItemVariants}
            key={n}
            className={`px-7 py-10 ${i < STATS.length - 1 ? 'border-line lg:border-r' : ''} ${i < 2 ? 'border-b lg:border-b-0' : ''}`}
          >
            <p className="font-display text-4xl tracking-tight sm:text-5xl lg:text-[56px]">
              {n}
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mid">
              {l}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

function Pillars() {
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-20 lg:px-12 lg:py-28">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-mid">
        como funciona
      </p>
      <h2 className="font-display mt-3 max-w-[900px] text-[36px] leading-[1.05] tracking-tight sm:text-5xl">
        Tres pecas que <span className="tc-underline">deveriam</span> ser uma so.
      </h2>

      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        {PILLARS.map((p) => (
          <article key={p.num} className="border-t border-ink pt-5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-mid">
                {p.num}
              </span>
              <span className="rounded-full border border-line bg-paper-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-mid">
                {p.tag}
              </span>
            </div>
            <h3 className="font-display mt-4 text-2xl tracking-tight sm:text-[28px]">
              {p.title}
            </h3>
            <p className="mt-3 font-serif text-[15.5px] leading-relaxed text-ink-soft">
              {p.body}
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-ink hover:text-ink-soft">
              conheca →
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Quote() {
  return (
    <section className="mx-auto max-w-[1100px] px-6 py-16 text-center lg:py-24">
      <p className="font-mono text-[11px] uppercase tracking-wider text-gold-dk">
        ★ ★ ★ ★ ★
      </p>
      <p className="font-display mt-4 text-2xl italic leading-[1.35] tracking-[-0.005em] sm:text-3xl">
        “Substituimos seis ferramentas, dobramos a conversao e o SDR{' '}
        <span className="tc-underline">finalmente</span> dorme a noite.”
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ink bg-paper-2 text-[12px] font-semibold uppercase">
          M
        </div>
        <div className="text-left">
          <p className="text-[13px] font-medium">Marina Coelho</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-mid">
            Head de RevOps · Caju
          </p>
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="mx-auto max-w-[1400px] px-6 pb-20 lg:px-12 lg:pb-28">
      <div className="rounded-sm border border-ink bg-ink px-7 py-12 text-paper lg:px-14 lg:py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper-3">
          setup em 1 dia
        </p>
        <h2 className="font-display mt-3 max-w-[800px] text-3xl leading-[1.05] tracking-tight text-paper sm:text-5xl">
          Pronto para entregar leads quentes direto na agenda?
        </h2>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/register">
            <Button
              size="lg"
              className="bg-gold text-ink hover:bg-gold/90"
            >
              Comecar gratis →
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="border-paper bg-transparent text-paper hover:bg-paper hover:text-ink"
          >
            Agendar com vendas
          </Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 py-10 lg:flex-row lg:justify-between lg:px-12">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-sm border border-ink bg-paper">
              <span className="font-display text-xs font-semibold leading-none">T</span>
            </div>
            <span className="font-display text-base tracking-tight">TypeCall</span>
          </div>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-mid">
            typeform + calendly, fundidos.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-14 gap-y-6 text-[13px]">
          {[
            { title: 'produto', items: ['Builder', 'Schedule', 'Analytics', 'Embed'] },
            { title: 'empresa', items: ['Clientes', 'Preco', 'Carreiras', 'Blog'] },
            { title: 'legal', items: ['LGPD', 'Termos', 'Seguranca', 'Status'] },
          ].map((c) => (
            <div key={c.title}>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-mid">
                {c.title}
              </p>
              <ul className="mt-3 space-y-1.5 text-ink-soft">
                {c.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}
