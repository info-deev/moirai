// utils/graphGeometry.ts
import { Axis, CARD_SIZE, RelationshipType } from '@/types/types'

/**
 * Точка в координатах сцены.
 */
export interface Point {
  x: number
  y: number
}

/**
 * Ключ связи в Record-структуре графа (решение D3): `${from}:${to}`.
 * @param {string} from - id персоны-отправителя
 * @param {string} to - id персоны-получателя
 * @returns {string} ключ записи связи
 */
export function getLinkKey(from: string, to: string): string {
  return `${from}:${to}`
}

/**
 * Стартовая якорная точка на карточке отправителя в зависимости от типа связи:
 * blood — середина правого края, остальные типы — середина нижнего края.
 * @param {RelationshipType} type - тип связи
 * @param {number} x - X координата карточки отправителя
 * @param {number} y - Y координата карточки отправителя
 * @returns {Point} точка выхода кривой из карточки
 */
export function getStartAnchor(type: RelationshipType, x: number, y: number): Point {
  if (type === RelationshipType.BLOOD) {
    return { x: x + CARD_SIZE.width, y: y + CARD_SIZE.height / 2 }
  }
  return { x: x + CARD_SIZE.width / 2, y: y + CARD_SIZE.height }
}

/**
 * Конечная якорная точка на карточке получателя в зависимости от типа связи:
 * blood — середина левого края, остальные типы — середина верхнего края.
 * @param {RelationshipType} type - тип связи
 * @param {number} x - X координата карточки получателя
 * @param {number} y - Y координата карточки получателя
 * @returns {Point} точка входа кривой в карточку
 */
export function getEndAnchor(type: RelationshipType, x: number, y: number): Point {
  if (type === RelationshipType.BLOOD) {
    return { x, y: y + CARD_SIZE.height / 2 }
  }
  return { x: x + CARD_SIZE.width / 2, y }
}

/**
 * Ось изгиба кривой связи: blood — горизонтальная (X), остальные — вертикальная (Y).
 * @param {RelationshipType} type - тип связи
 * @returns {Axis} ось изгиба
 */
export function getLinkAxis(type: RelationshipType): Axis {
  return type === RelationshipType.BLOOD ? Axis.X : Axis.Y
}

/**
 * Расчёт контрольных точек кривой Безье для связи между персонами.
 * @param {number} x1 - X начала связи
 * @param {number} y1 - Y начала связи
 * @param {number} x2 - X конца связи
 * @param {number} y2 - Y конца связи
 * @param {Axis} [axis=Axis.X] - ось изгиба кривой
 * @returns {number[]} массив `[x1, y1, cx1, cy1, cx2, cy2, x2, y2]` для Konva.Line
 */
export function calculateBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  axis: Axis = Axis.X,
): number[] {
  if (axis === Axis.X) {
    const dist = Math.abs(x2 - x1) * 0.5
    return [x1, y1, x1 + dist, y1, x2 - dist, y2, x2, y2]
  }
  const dist = Math.abs(y2 - y1) * 0.5
  return [x1, y1, x1, y1 + dist, x2, y2 - dist, x2, y2]
}
