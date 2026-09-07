import { describe, expect, it } from 'vitest'
import { CARD_SIZE, Gender, type Person } from '@/types/types'
import { computeFitToContent, type FitViewOptions } from './fitView'

/** Создаёт тестовую персону с переопределением полей. */
function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: 'p1',
    x: 0,
    y: 0,
    firstName: 'Анна',
    lastName: '',
    gender: Gender.FEMALE,
    ...overrides,
  }
}

/** Viewport и параметры вписывания для тестов. */
const VIEWPORT = { width: 1200, height: 600 }
const OPTIONS: FitViewOptions = { minZoom: 0.25, maxZoom: 1, padding: 40 }

describe('computeFitToContent', () => {
  it('возвращает null для пустого графа', () => {
    expect(computeFitToContent([], VIEWPORT.width, VIEWPORT.height, OPTIONS)).toBeNull()
  })

  it('не приближает сильнее maxZoom: одна карточка центрируется при scale 1', () => {
    const transform = computeFitToContent([makePerson()], VIEWPORT.width, VIEWPORT.height, OPTIONS)
    expect(transform).not.toBeNull()
    if (!transform) return

    expect(transform.scale).toBe(1)
    // Центр карточки (80, 30) совпадает с центром viewport (600, 300)
    expect(transform.x).toBe(VIEWPORT.width / 2 - CARD_SIZE.width / 2)
    expect(transform.y).toBe(VIEWPORT.height / 2 - CARD_SIZE.height / 2)
  })

  it('уменьшает масштаб, чтобы широкий граф вписался во viewport', () => {
    // Bounding-box: 0..1440 × 0..60 (две карточки с разбросом по X)
    const persons = [makePerson(), makePerson({ id: 'p2', x: 1280 })]
    const transform = computeFitToContent(persons, VIEWPORT.width, VIEWPORT.height, OPTIONS)
    expect(transform).not.toBeNull()
    if (!transform) return

    const boxWidth = 1280 + CARD_SIZE.width
    const expectedScale = (VIEWPORT.width - OPTIONS.padding * 2) / boxWidth
    expect(transform.scale).toBeCloseTo(expectedScale, 10)
    // Контент центрирован: левый край на отступе, правый — симметрично
    expect(transform.x).toBeCloseTo(OPTIONS.padding, 10)
    const rightEdge = transform.x + boxWidth * transform.scale
    expect(rightEdge).toBeCloseTo(VIEWPORT.width - OPTIONS.padding, 10)
  })

  it('ограничивает масштаб minZoom для огромного графа (контент остаётся центрирован)', () => {
    const persons = [makePerson(), makePerson({ id: 'p2', x: 100_000 })]
    const transform = computeFitToContent(persons, VIEWPORT.width, VIEWPORT.height, OPTIONS)
    expect(transform).not.toBeNull()
    if (!transform) return

    expect(transform.scale).toBe(OPTIONS.minZoom)
    // Центр bounding-box (50_080, 30) попадает в центр viewport
    const boxCenterX = (100_000 + CARD_SIZE.width) / 2
    expect(transform.x + boxCenterX * transform.scale).toBeCloseTo(VIEWPORT.width / 2, 6)
  })

  it('учитывает координаты карточек: далёкая карточка центрируется в viewport', () => {
    const persons = [makePerson({ x: 500, y: 300 })]
    const transform = computeFitToContent(persons, VIEWPORT.width, VIEWPORT.height, OPTIONS)
    expect(transform).not.toBeNull()
    if (!transform) return

    expect(transform.scale).toBe(1)
    // Центр карточки (580, 330) → центр viewport (600, 300)
    expect(transform.x + 580).toBe(VIEWPORT.width / 2)
    expect(transform.y + 330).toBe(VIEWPORT.height / 2)
  })

  it('не приближает сильнее maxZoom даже на маленьком viewport', () => {
    const transform = computeFitToContent([makePerson()], 300, 300, OPTIONS)
    expect(transform).not.toBeNull()
    if (!transform) return

    // Доступная область 220×220 → raw-масштаб 1.375 → clamp до maxZoom = 1
    expect(transform.scale).toBe(1)
    expect(transform.x).toBe(OPTIONS.padding + (220 - CARD_SIZE.width) / 2)
    expect(transform.y).toBe(OPTIONS.padding + (220 - CARD_SIZE.height) / 2)
  })
})
