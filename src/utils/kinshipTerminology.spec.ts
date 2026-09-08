import { describe, expect, it } from 'vitest'
import { Gender, type Person } from '@/types/types'
import type { KinshipPath, KinshipStepDirection } from './kinshipPath'
import { describeKinship } from './kinshipTerminology'

/** Персона с заданным полом; координаты и имена на термины не влияют. */
const person = (id: string, gender: Gender): Person => ({
  id,
  x: 0,
  y: 0,
  firstName: id,
  lastName: '',
  gender,
})

/**
 * Набор персон для описания родства: якорь `a`, (опц.) ребёнок `x`,
 * внук/внучка `y` и целевая персона. Опциональные аргументы — пол промежуточных персон.
 */
const persons = (
  anchorGender: Gender,
  targetGender: Gender,
  childGender?: Gender,
  grandChildGender?: Gender,
): Record<string, Person> => ({
  a: person('a', anchorGender),
  ...(childGender !== undefined ? { x: person('x', childGender) } : {}),
  ...(grandChildGender !== undefined ? { y: person('y', grandChildGender) } : {}),
  target: person('target', targetGender),
})

/** Путь из якоря A через перечисленные шаги; `ids` — id персон от A до B. */
const path = (ids: string[], directions: KinshipStepDirection[]): KinshipPath => ({
  steps: [
    { personId: ids[0]!, relation: null, direction: null },
    ...directions.map((direction, i) => ({ personId: ids[i + 1]!, relation: null, direction })),
  ],
  distance: directions.length,
})

describe('describeKinship', () => {
  it('distance 0 → «одна и та же персона»', () => {
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), path(['a'], []))).toEqual({
      label: 'одна и та же персона',
      exact: true,
    })
  })

  it('up ×1 → отец/мать по полу целевой персоны', () => {
    const p = path(['a', 'target'], ['up'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('отец (1-е колено)')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'мать (1-е колено)',
    )
  })

  it('down ×1 → сын/дочь', () => {
    const p = path(['a', 'target'], ['down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('сын (1-е колено)')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'дочь (1-е колено)',
    )
  })

  it('up ×2 → дед/бабка', () => {
    const p = path(['a', 'x', 'target'], ['up', 'up'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('дед (2-е колено)')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'бабка (2-е колено)',
    )
  })

  it('up ×3 и up ×4 → прадед/прабабка, прапрадед', () => {
    const g = path(['a', 'x', 'y', 'target'], ['up', 'up', 'up'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), g).label).toBe(
      'прадед (3-е колено)',
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), g).label).toBe(
      'прабабка (3-е колено)',
    )

    const gg = path(['a', 'x', 'y', 'z', 'target'], ['up', 'up', 'up', 'up'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), gg).label).toBe(
      'прапрадед (4-е колено)',
    )
  })

  it('down ×2 → внук/внучка', () => {
    const p = path(['a', 'x', 'target'], ['down', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('внук (2-е колено)')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'внучка (2-е колено)',
    )
  })

  it('up1+down1 → брат/сестра', () => {
    const p = path(['a', 'x', 'target'], ['up', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('брат (2-е колено)')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'сестра (2-е колено)',
    )
  })

  it('up2+down1 и up3+down1 → дядя/тётя', () => {
    const uncle = path(['a', 'x', 'y', 'target'], ['up', 'up', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), uncle).label).toBe(
      'дядя (3-е колено)',
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), uncle).label).toBe(
      'тётя (3-е колено)',
    )

    const greatUncle = path(['a', 'x', 'y', 'z', 'target'], ['up', 'up', 'up', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), greatUncle).label).toBe(
      'дядя (4-е колено)',
    )
  })

  it('up1+down2 → племянник/племянница', () => {
    const p = path(['a', 'x', 'y', 'target'], ['up', 'down', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe(
      'племянник (3-е колено)',
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'племянница (3-е колено)',
    )
  })

  it('up2+down2 и up3+down3 → двоюродный/троюродный брат', () => {
    const second = path(['a', 'x', 'y', 'z', 'target'], ['up', 'up', 'down', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), second).label).toBe(
      'двоюродный брат (4-е колено)',
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), second).label).toBe(
      'двоюродная сестра (4-е колено)',
    )

    const third = path(
      ['a', 'x', 'y', 'z', 'w', 'v', 'target'],
      ['up', 'up', 'up', 'down', 'down', 'down'],
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), third).label).toBe(
      'троюродный брат (6-е колено)',
    )
  })

  it('неизвестное поле → «X или Y»', () => {
    const p = path(['a', 'target'], ['up'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.UNKNOWN), p).label).toBe(
      'отец или мать (1-е колено)',
    )
  })

  it('down ×3 → правнук/правнучка (глубокий потомок)', () => {
    const p = path(['a', 'x', 'y', 'target'], ['down', 'down', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe(
      'правнук (3-е колено)',
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'правнучка (3-е колено)',
    )
  })

  it('down ×4 → праправнук/праправнучка', () => {
    const p = path(['a', 'x', 'y', 'z', 'target'], ['down', 'down', 'down', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe(
      'праправнук (4-е колено)',
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'праправнучка (4-е колено)',
    )
  })

  it('путь с браком [spouse, up] → точный сводный термин по полу якоря', () => {
    const p = path(['a', 'x', 'target'], ['spouse', 'up'])
    expect(describeKinship(persons(Gender.MALE, Gender.UNKNOWN), p).label).toBe(
      'тесть или тёща (в силу брака)',
    )
    expect(describeKinship(persons(Gender.FEMALE, Gender.UNKNOWN), p).label).toBe(
      'свёкор или свекровь (в силу брака)',
    )
  })

  it('немоноотонный путь (down до первого up) → fallback-цепочка', () => {
    const p = path(['a', 'x', 'target'], ['down', 'up'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p)).toEqual({
      label: 'ребёнок → родитель',
      exact: false,
    })
  })

  it('два брака в пути [spouse, up, spouse] → сжатие моста → тесть/тёща по полу якоря', () => {
    const p = path(['a', 'x', 'y', 'target'], ['spouse', 'up', 'spouse'])
    expect(describeKinship(persons(Gender.MALE, Gender.UNKNOWN), p).label).toBe(
      'тесть или тёща (в силу брака)',
    )
    expect(describeKinship(persons(Gender.FEMALE, Gender.UNKNOWN), p).label).toBe(
      'свёкор или свекровь (в силу брака)',
    )
  })

  it('немоноотонный сегмент вокруг брака [down, spouse] → fallback-цепочка', () => {
    const p = path(['a', 'x', 'y', 'target'], ['up', 'down', 'spouse'])
    expect(describeKinship(persons(Gender.MALE, Gender.UNKNOWN), p)).toEqual({
      label: 'родитель → ребёнок → супруг',
      exact: false,
    })
  })
})

describe('describeKinship — прозрачные брачные мосты (ровно один брак)', () => {
  it('[spouse] → супруг/супруга по полу целевой персоны', () => {
    const p = path(['a', 'target'], ['spouse'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('супруг')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe('супруга')
  })

  it('[spouse, down] → сын/дочь (потомок через супруга)', () => {
    const p = path(['a', 'x', 'target'], ['spouse', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('сын (1-е колено)')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'дочь (1-е колено)',
    )
  })

  it('[up, spouse] → отец/мать (предок через супруга)', () => {
    const p = path(['a', 'x', 'target'], ['up', 'spouse'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('отец (1-е колено)')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'мать (1-е колено)',
    )
  })

  it('[spouse, down, down] → внук/внучка (глубже потомок через мост)', () => {
    const p = path(['a', 'x', 'y', 'target'], ['spouse', 'down', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('внук (2-е колено)')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'внучка (2-е колено)',
    )
  })

  it('[spouse, down ×3] → правнук/правнучка (глубокий потомок через мост)', () => {
    const p = path(['a', 'x', 'y', 'z', 'target'], ['spouse', 'down', 'down', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe(
      'правнук (3-е колено)',
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'правнучка (3-е колено)',
    )
  })

  it('[up, up, spouse] → дед/бабка (глубже предок через мост)', () => {
    const p = path(['a', 'x', 'y', 'target'], ['up', 'up', 'spouse'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('дед (2-е колено)')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'бабка (2-е колено)',
    )
  })

  it('[up, spouse, down] → брат/сестра (боковое родство через мост)', () => {
    const p = path(['a', 'x', 'y', 'target'], ['up', 'spouse', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('брат (2-е колено)')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'сестра (2-е колено)',
    )
  })

  it('[up, up, spouse, down] → дядя/тётя (дальнее боковое через мост)', () => {
    const p = path(['a', 'x', 'y', 'z', 'target'], ['up', 'up', 'spouse', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe('дядя (3-е колено)')
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'тётя (3-е колено)',
    )
  })

  it('[up, spouse, down, down] → племянник/племянница (боковое через мост)', () => {
    const p = path(['a', 'x', 'y', 'z', 'target'], ['up', 'spouse', 'down', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe(
      'племянник (3-е колено)',
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'племянница (3-е колено)',
    )
  })

  it('[up ×4, spouse, down] → глубина вне таблицы → fallback-цепочка', () => {
    const p = path(
      ['a', 'x', 'y', 'z', 'w', 'v', 'target'],
      ['up', 'up', 'up', 'up', 'spouse', 'down'],
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p)).toEqual({
      label: 'родитель → родитель → родитель → родитель → супруг → ребёнок',
      exact: false,
    })
  })

  it('[spouse, up, down] → шурин/золовка (брат/сестра супруга) по полу целевой персоны', () => {
    const p = path(['a', 'x', 'y', 'target'], ['spouse', 'up', 'down'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe(
      'шурин (в силу брака)',
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'золовка (в силу брака)',
    )
  })

  it('[down, spouse] → невестка/зять (супруг ребёнка) по полу ребёнка', () => {
    const p = path(['a', 'x', 'target'], ['down', 'spouse'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.UNKNOWN, Gender.MALE), p).label).toBe(
      'невестка (в силу брака)',
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'зять (в силу брака)',
    )
  })

  it('[up ×3, spouse] → прадед/прабабка (глубже предок через мост)', () => {
    const p = path(['a', 'x', 'y', 'z', 'target'], ['up', 'up', 'up', 'spouse'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe(
      'прадед (3-е колено)',
    )
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE), p).label).toBe(
      'прабабка (3-е колено)',
    )
  })

  it('[down, down, spouse] → муж/жена внука по полу потомка и цели', () => {
    const p = path(['a', 'x', 'y', 'target'], ['down', 'down', 'spouse'])
    expect(
      describeKinship(persons(Gender.UNKNOWN, Gender.MALE, undefined, Gender.MALE), p).label,
    ).toBe('муж внука (2-е колено)')
    expect(
      describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE, undefined, Gender.MALE), p).label,
    ).toBe('жена внука (2-е колено)')
    expect(
      describeKinship(persons(Gender.UNKNOWN, Gender.FEMALE, undefined, Gender.FEMALE), p).label,
    ).toBe('жена внучки (2-е колено)')
  })

  it('[down, down, spouse] с неизвестным полом потомка → «внука или внучки»', () => {
    const p = path(['a', 'x', 'y', 'target'], ['down', 'down', 'spouse'])
    expect(describeKinship(persons(Gender.UNKNOWN, Gender.MALE), p).label).toBe(
      'муж внука или внучки (2-е колено)',
    )
  })
})
