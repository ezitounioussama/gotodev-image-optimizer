import { availableParallelism } from 'node:os'

export type WorkerTask<T> = () => Promise<T>

interface QueueItem {
  task: WorkerTask<unknown>
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

const POOL_SIZE = Math.max(1, availableParallelism() - 1)

export class WorkerPool {
  private queue: QueueItem[] = []
  private active = 0
  private maxWorkers: number

  constructor(maxWorkers: number = POOL_SIZE) {
    this.maxWorkers = Math.max(1, maxWorkers)
  }

  async run<T>(task: WorkerTask<T>): Promise<T> {
    if (this.active < this.maxWorkers) {
      this.active++
      try {
        const result = await task()
        this.active--
        this.drain()
        return result
      } catch (error) {
        this.active--
        this.drain()
        throw error
      }
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        task: task as WorkerTask<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      })
    })
  }

  private drain(): void {
    while (this.active < this.maxWorkers && this.queue.length > 0) {
      const item = this.queue.shift()
      if (!item) break
      this.active++
      item
        .task()
        .then((result) => {
          this.active--
          item.resolve(result)
          this.drain()
        })
        .catch((error) => {
          this.active--
          item.reject(error)
          this.drain()
        })
    }
  }

  get pending(): number {
    return this.queue.length
  }

  get running(): number {
    return this.active
  }
}
