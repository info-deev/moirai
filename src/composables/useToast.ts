import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  type: ToastType
  message: string
}

// Модульное состояние: один общий список тостов на всё приложение
const toasts = reactive<Toast[]>([])
let nextId = 1

/**
 * Убирает тост по id (ручное закрытие по клику).
 * @param {number} id - идентификатор тоста
 */
function removeToast(id: number) {
  const index = toasts.findIndex((t) => t.id === id)
  if (index !== -1) toasts.splice(index, 1)
}

/**
 * Композабл уведомлений (тостов) без внешних зависимостей.
 * Тосты автоматически скрываются через `duration` мс или по клику.
 */
export function useToast() {
  /**
   * Добавляет тост.
   * @param {ToastType} type - тип уведомления
   * @param {string} message - текст сообщения
   * @param {number} [duration=3500] - время жизни, мс
   */
  const push = (type: ToastType, message: string, duration = 3500) => {
    const id = nextId++
    toasts.push({ id, type, message })
    setTimeout(() => removeToast(id), duration)
  }

  return {
    toasts,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
    dismiss: removeToast,
  }
}
