import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AltCta {
  label: string
  to: string
}

interface AuthShellProps {
  step: string
  title: string
  altText: string
  altCta: AltCta
  children: ReactNode
  /** Override left-side editorial copy. */
  pitchEyebrow?: string
  pitchTitle?: ReactNode
  pitchBody?: string
}

export function AuthShell({
  step,
  title,
  altText,
  altCta,
  children,
  pitchEyebrow = 'Para times de pre-venda',
  pitchTitle,
  pitchBody = 'Substitua Typeform + Calendly por uma conversa fluida que entrega o lead pronto direto na agenda do vendedor.',
}: AuthShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-paper text-ink lg:grid-cols-[minmax(0,46%)_1fr]">
      <PitchPanel
        eyebrow={pitchEyebrow}
        title={
          pitchTitle ?? (
            <>
              Qualifique e <span className="tc-underline">agende</span>
              <br />
              no mesmo fluxo.
            </>
          )
        }
        body={pitchBody}
      />

      <section className="flex flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
        <div className="flex items-center justify-end gap-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-mid">
            {altText}
          </span>
          <Link
            to={altCta.to}
            className="font-mono text-[11px] uppercase tracking-wider text-ink underline underline-offset-2 hover:text-ink-soft"
          >
            {altCta.label}
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-[380px] py-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-mid">
            {step}
          </p>
          <h1 className="font-display mt-2 text-3xl leading-tight tracking-tight text-ink sm:text-[34px]">
            {title}
          </h1>
          <div className="mt-7">{children}</div>
        </div>

        <footer className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-low">
          <span>© TypeCall 2026</span>
          <span>SOC 2 · LGPD</span>
        </footer>
      </section>
    </div>
  )
}

function PitchPanel({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: ReactNode
  body: string
}) {
  return (
    <aside className="hidden flex-col gap-7 border-r border-line bg-paper-2 px-10 py-10 lg:flex xl:px-14">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-ink bg-paper">
          <span className="font-display text-base font-semibold leading-none">T</span>
        </div>
        <span className="font-display text-lg tracking-tight">TypeCall</span>
      </div>

      <div className="mt-12 max-w-[460px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-mid">
          {eyebrow}
        </p>
        <h2 className="font-display mt-4 text-[42px] leading-[1.05] tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-5 font-serif text-[16px] leading-relaxed text-ink-soft">
          {body}
        </p>
      </div>

      <div className="mt-auto">
        <div className="rounded-sm border border-line bg-paper p-5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-gold-dk">
            ★ ★ ★ ★ ★
          </p>
          <p className="mt-3 font-serif text-[14px] italic leading-snug text-ink">
            “Reduzimos no-show em 41% no primeiro mes. O SDR trabalha 3× mais
            leads quentes.”
          </p>
          <div className="mt-4 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-ink bg-paper-2 text-[11px] font-semibold uppercase">
              M
            </div>
            <div>
              <p className="text-[12px] font-medium text-ink">Marina Coelho</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-low">
                Head de RevOps · Caju
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
