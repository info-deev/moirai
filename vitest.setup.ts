// vitest.setup.ts
/**
 * In-memory реализация Web Storage для тестов.
 * В jsdom-среде этого окружения методы localStorage (setItem/getItem/...) не доступны,
 * поэтому перед каждым файлом тестов устанавливаем детерминированный мок.
 */
class MemoryStorage {
  private data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value))
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  clear(): void {
    this.data.clear()
  }
}

const memoryStorage = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true })
Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true })
