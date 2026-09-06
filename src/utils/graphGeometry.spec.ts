import { describe, expect, it } from 'vitest'
import { Axis, CARD_SIZE, RelationshipType } from '@/types/types'
import {
  calculateBezier,
  getEndAnchor,
  getLinkAxis,
  getLinkKey,
  getStartAnchor,
} from './graphGeometry'

describe('getLinkKey', () => {
  it('собирает ключ записи связи в формате `${from}:${to}`', () => {
    expect(getLinkKey('p1', 'p2')).toBe('p1:p2')
  })
})

describe('getStartAnchor', () => {
  it('blood/adoption: точка выхода — середина правого края карточки отправителя', () => {
    const expected = { x: 10 + CARD_SIZE.width, y: 20 + CARD_SIZE.height / 2 }
    expect(getStartAnchor(RelationshipType.BLOOD, 10, 20)).toEqual(expected)
    expect(getStartAnchor(RelationshipType.ADOPTION, 10, 20)).toEqual(expected)
  })

  it('marriage: точка выхода — середина нижнего края', () => {
    expect(getStartAnchor(RelationshipType.MARRIAGE, 10, 20)).toEqual({
      x: 10 + CARD_SIZE.width / 2,
      y: 20 + CARD_SIZE.height,
    })
  })
})

describe('getEndAnchor', () => {
  it('blood/adoption: точка входа — середина левого края карточки получателя', () => {
    const expected = { x: 10, y: 20 + CARD_SIZE.height / 2 }
    expect(getEndAnchor(RelationshipType.BLOOD, 10, 20)).toEqual(expected)
    expect(getEndAnchor(RelationshipType.ADOPTION, 10, 20)).toEqual(expected)
  })

  it('marriage: точка входа — середина верхнего края', () => {
    expect(getEndAnchor(RelationshipType.MARRIAGE, 10, 20)).toEqual({
      x: 10 + CARD_SIZE.width / 2,
      y: 20,
    })
  })
})

describe('getLinkAxis', () => {
  it('blood/adoption: горизонтальная ось изгиба (X)', () => {
    expect(getLinkAxis(RelationshipType.BLOOD)).toBe(Axis.X)
    expect(getLinkAxis(RelationshipType.ADOPTION)).toBe(Axis.X)
  })

  it('marriage: вертикальная ось изгиба (Y)', () => {
    expect(getLinkAxis(RelationshipType.MARRIAGE)).toBe(Axis.Y)
  })
})

describe('calculateBezier', () => {
  it('по умолчанию изгибает кривую по горизонтали (Axis.X)', () => {
    // dist = |100 - 0| * 0.5 = 50
    expect(calculateBezier(0, 0, 100, 50)).toEqual([0, 0, 50, 0, 50, 50, 100, 50])
  })

  it('ось X: контрольные точки смещены на половину горизонтального расстояния', () => {
    // dist = |0 - 100| * 0.5 = 50
    expect(calculateBezier(100, 0, 0, 50, Axis.X)).toEqual([100, 0, 150, 0, -50, 50, 0, 50])
  })

  it('ось Y: контрольные точки смещены на половину вертикального расстояния', () => {
    // dist = |100 - 0| * 0.5 = 50
    expect(calculateBezier(0, 0, 10, 100, Axis.Y)).toEqual([0, 0, 0, 50, 10, 50, 10, 100])
  })

  it('совпадающие точки дают нулевое смещение контрольных точек', () => {
    expect(calculateBezier(5, 5, 5, 5)).toEqual([5, 5, 5, 5, 5, 5, 5, 5])
  })
})
