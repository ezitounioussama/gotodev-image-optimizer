import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PredictiveLoader } from '../src/adaptive/predictive.ts'

describe('PredictiveLoader', () => {
  let loader: PredictiveLoader

  beforeEach(() => {
    window.IntersectionObserver = vi.fn(function () {
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }
    }) as unknown as typeof IntersectionObserver
    window.scrollY = 0
  })

  afterEach(() => {
    loader?.destroy()
    vi.restoreAllMocks()
  })

  it('creates instance without crashing', () => {
    loader = new PredictiveLoader()
    expect(loader).toBeInstanceOf(PredictiveLoader)
  })

  it('returns default preload margin', () => {
    loader = new PredictiveLoader()
    expect(loader.getPreloadMargin()).toBe('600px')
  })

  it('observes an element without throwing', () => {
    loader = new PredictiveLoader()
    const el = document.createElement('div')
    const callback = vi.fn()
    expect(() => loader.observe(el, callback)).not.toThrow()
  })

  it('cleans up on destroy', () => {
    loader = new PredictiveLoader()
    const spy = vi.spyOn(window, 'removeEventListener')
    loader.destroy()
    expect(spy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
