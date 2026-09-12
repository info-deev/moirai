// utils/fitView.ts
import { CARD_SIZE, type Person } from '@/types/types'

/**
 * Параметры вписывания контента (в экранных пикселях).
 */
export interface FitViewOptions {
  /** Минимальный допустимый масштаб сцены. */
  minZoom: number
  /** Максимальный допустимый масштаб сцены (для импорта — не более 1, чтобы не приближать сильнее 100%). */
  maxZoom: number
  /** Отступ вокруг контента при вписывании во viewport. */
  padding: number
}

/**
 * Результат расчёта вписывания: масштаб и смещение stage.
 */
export interface FitViewTransform {
  x: number
  y: number
  scale: number
}

/**
 * Вычисляет масштаб и смещение сцены, при которых все карточки
 * (верхний левый угол — Person.x/Person.y, размер CARD_SIZE) вписываются
 * во viewport с отступом padding и центрируются по нему.
 * Пустой граф → null (центрировать нечего).
 * @param {readonly Person[]} persons - карточки графа
 * @param {number} viewportWidth - ширина viewport, px
 * @param {number} viewportHeight - высота viewport, px
 * @param {FitViewOptions} options - границы зума и отступ вписывания
 */
export function computeFitToContent(
  persons: readonly Person[],
  viewportWidth: number,
  viewportHeight: number,
  options: FitViewOptions,
): FitViewTransform | null {
  if (persons.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const person of persons) {
    minX = Math.min(minX, person.x)
    minY = Math.min(minY, person.y)
    maxX = Math.max(maxX, person.x + CARD_SIZE.width)
    maxY = Math.max(maxY, person.y + CARD_SIZE.height)
  }

  const boxWidth = maxX - minX
  const boxHeight = maxY - minY
  const availableWidth = Math.max(viewportWidth - options.padding * 2, 1)
  const availableHeight = Math.max(viewportHeight - options.padding * 2, 1)

  const rawScale = Math.min(availableWidth / boxWidth, availableHeight / boxHeight)
  const scale = Math.min(options.maxZoom, Math.max(options.minZoom, rawScale))

  // Центрируем bounding-box контента в viewport с учётом отступа
  const x = options.padding + (availableWidth - boxWidth * scale) / 2 - minX * scale
  const y = options.padding + (availableHeight - boxHeight * scale) / 2 - minY * scale

  return { x, y, scale }
}
