interface PredictiveState {
  velocity: number
  direction: 'up' | 'down' | 'none'
  lastScrollY: number
  lastTimestamp: number
  preloadDistance: number
}

const MIN_PRELOAD = 600
const MAX_PRELOAD = 3000
const VELOCITY_SAMPLES = 5

export class PredictiveLoader {
  private state: PredictiveState = {
    velocity: 0,
    direction: 'none',
    lastScrollY: 0,
    lastTimestamp: Date.now(),
    preloadDistance: MIN_PRELOAD,
  }

  private velocities: number[] = []
  private observer: IntersectionObserver | null = null
  constructor() {
    if (typeof window !== 'undefined') {
      this.state.lastScrollY = window.scrollY
      window.addEventListener('scroll', this.onScroll, { passive: true })
    }
  }

  private onScroll = (): void => {
    const now = Date.now()
    const dt = Math.max(1, now - this.state.lastTimestamp)
    const dy = Math.abs(window.scrollY - this.state.lastScrollY)
    const velocity = dy / dt

    this.velocities.push(velocity)
    if (this.velocities.length > VELOCITY_SAMPLES) {
      this.velocities.shift()
    }

    const avgVelocity = this.velocities.reduce((a, b) => a + b, 0) / this.velocities.length

    this.state.velocity = avgVelocity
    this.state.direction =
      window.scrollY > this.state.lastScrollY
        ? 'down'
        : window.scrollY < this.state.lastScrollY
          ? 'up'
          : 'none'
    this.state.lastScrollY = window.scrollY
    this.state.lastTimestamp = now
    this.state.preloadDistance = Math.min(MAX_PRELOAD, MIN_PRELOAD + avgVelocity * 5000)
  }

  getPreloadMargin(): string {
    return `${this.state.preloadDistance}px`
  }

  observe(element: HTMLElement, callback: (entry: IntersectionObserverEntry) => void): void {
    this.observer?.disconnect()
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            callback(entry)
            this.observer?.unobserve(entry.target)
          }
        }
      },
      {
        rootMargin: this.getPreloadMargin(),
        threshold: 0.01,
      },
    )

    this.observer.observe(element)
  }

  unobserve(element: HTMLElement): void {
    this.observer?.unobserve(element)
  }

  destroy(): void {
    this.observer?.disconnect()
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.onScroll)
    }
    this.observer = null
  }
}
