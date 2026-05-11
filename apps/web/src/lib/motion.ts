import type { Transition } from 'motion/react'
export { useReducedMotion } from 'motion/react'

export const DUR = {
  tap: 0.12,
  micro: 0.2,
  route: 0.35,
  cinema: 0.6,
} as const

export const EASE = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  inOut: [0.4, 0, 0.2, 1] as const,
} as const

type WithTransition = { transition?: Transition }

export function withReducedMotion<T extends WithTransition>(props: T, reduced: boolean): T {
  if (!reduced) return props
  return {
    ...props,
    transition: { ...props.transition, duration: 0 },
  }
}
