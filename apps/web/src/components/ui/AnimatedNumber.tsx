import { useEffect, useRef, useState } from 'react'
import { animate, useMotionValue } from 'motion/react'
import { DUR, EASE, useReducedMotion } from '@/lib/motion'

interface AnimatedNumberProps {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString('pt-BR')

export function AnimatedNumber({
  value,
  format = defaultFormat,
  duration = DUR.cinema,
  className,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion()
  const mv = useMotionValue(reduced ? value : 0)
  const [display, setDisplay] = useState(() => format(reduced ? value : 0))
  const prev = useRef(reduced ? value : 0)

  useEffect(() => {
    if (reduced) {
      setDisplay(format(value))
      mv.set(value)
      prev.current = value
      return
    }
    const controls = animate(mv, value, {
      duration,
      ease: EASE.outExpo,
      onUpdate: (latest) => setDisplay(format(latest)),
    })
    prev.current = value
    return () => controls.stop()
  }, [value, duration, format, mv, reduced])

  return <span className={`tabular-nums ${className ?? ''}`}>{display}</span>
}
