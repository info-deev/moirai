// utils/kinshipTerminology.ts
import { Gender, type Person } from '@/types/types'
import type { KinshipPath, KinshipStepDirection } from './kinshipPath'

/**
 * Результат описания родства персоны B относительно якоря A.
 */
export interface KinshipDescription {
  /** Термин отношения B к A (например «дядя», «двоюродная сестра»). */
  label: string
  /** true — точный термин из таблицы; false — fallback-цепочка шагов («родитель → ребёнок»). */
  exact: boolean
}

/** Подставляет род B'ы (MALE/FEMALE); при неизвестном поле — «X или Y». */
function byGender(gender: Gender, male: string, female: string): string {
  if (gender === Gender.MALE) return male
  if (gender === Gender.FEMALE) return female
  return `${male} или ${female}`
}

/** Термин для предка на `ups` поколений выше. */
function ancestorTerm(ups: number, gender: Gender): string {
  if (ups === 1) return byGender(gender, 'отец', 'мать')
  if (ups === 2) return byGender(gender, 'дед', 'бабка')
  const prefix = 'пра'.repeat(ups - 2)
  return byGender(gender, `${prefix}дед`, `${prefix}бабка`)
}

/** Термин для бокового родства (up* → down*); null — в таблице нет. */
// function collateralTerm(ups: number, downs: number, gender: Gender): string | null {
//   if (ups === 1 && downs === 1) return byGender(gender, 'брат', 'сестра')
//   if ((ups === 2 || ups === 3) && downs === 1) return byGender(gender, 'дядя', 'тётя')
//   if (ups === 1 && downs === 2) return byGender(gender, 'племянник', 'племянница')
//   if (ups === 2 && downs === 2) return byGender(gender, 'двоюродный брат', 'двоюродная сестра')
//   if (ups === 3 && downs === 3) return byGender(gender, 'троюродный брат', 'троюродная сестра')
//   return null
// }

/** Термин для бокового родства (up* → down*). Полное покрытие всех колен. */
function collateralTerm(ups: number, downs: number, gender: Gender): string | null {
  // Поколение братьев и сестер (на одном уровне с вами)
  if (ups === 1 && downs === 1) return byGender(gender, 'брат', 'сестра')
  if (ups === 2 && downs === 2) return byGender(gender, 'двоюродный брат', 'двоюродная сестра')
  if (ups === 3 && downs === 3) return byGender(gender, 'троюродный брат', 'троюродная сестра')
  if (ups >= 4 && ups === downs) {
    const prefixes = ['четвероюродный', 'пятиюродный', 'шестиюродный', 'семиюродный']
    const pref = prefixes[ups - 4] || `${ups}-юродный`
    return byGender(gender, `${pref} брат`, `${pref} сестра`)
  }

  // --- ПОТОМКИ БРАТЬЕВ/СЕСТЕР (Племянники) ---
  if (ups === 1 && downs >= 2) {
    if (downs === 2) return byGender(gender, 'племянник', 'племянница') // 3 колено
    if (downs === 3) return byGender(gender, 'внучатый племянник', 'внучатая племянница') // 4 колено
    const praCount = downs - 3
    const prefix = 'пра'.repeat(praCount)
    return byGender(gender, `${prefix}внучатый племянник`, `${prefix}внучатая племянница`)
  }

  // --- ПОТОМКИ ДВОЮРОДНЫХ/ТРОЮРОДНЫХ БРАТЬЕВ (Двоюродные племянники) ---
  if (ups > 1 && downs > ups) {
    const degreeWords = ['', 'двоюродный', 'троюродный', 'четвероюродный', 'пятиюродный']
    const degree = degreeWords[ups] || `${ups}-юродный`

    const diff = downs - ups // На сколько поколений ниже вас
    if (diff === 1) return byGender(gender, `${degree} племянник`, `${degree} племянница`)
    if (diff === 2)
      return byGender(gender, `${degree} внучатый племянник`, `${degree} внучатая племянница`)

    const praCount = diff - 2
    const prefix = 'пра'.repeat(praCount)
    return byGender(
      gender,
      `${degree} ${prefix}внучатый племянник`,
      `${degree} ${prefix}внучатая племянница`,
    )
  }

  // --- ПРЕДКИ (Дяди и Тёти): братья/сёстры родителей и дедов; глубже — вне таблицы → null ---
  if (downs === 1 && ups >= 2 && ups <= 3) {
    return byGender(gender, 'дядя', 'тётя')
  }

  // --- СЛОЖНЫЕ ВЕТВИ ВВЕРХ (Двоюродные дяди/тети) ---
  if (downs > 1 && ups > downs) {
    const degreeWords = ['', 'двоюродный', 'троюродный', 'четвероюродный']
    const degree = degreeWords[downs + 1] || `${downs + 1}-юродный`

    const diff = ups - downs
    if (diff === 1) return byGender(gender, `${degree} дядя`, `${degree} тётя`)

    const praCount = diff - 1
    const prefix = 'пра'.repeat(praCount)
    return byGender(gender, `${prefix}${degree} дедушка`, `${prefix}${degree} бабушка`)
  }

  return null
}

/** Короткие подписи шагов для fallback-цепочки. */
const STEP_LABELS: Record<KinshipStepDirection, string> = {
  up: 'родитель',
  down: 'ребёнок',
  spouse: 'супруг',
}

/** Fallback: честная цепочка шагов «родитель → ребёнок → …» без попытки угадать термин. */
function fallbackChain(path: KinshipPath): string {
  return path.steps
    .slice(1)
    .map((step) => (step.direction ? STEP_LABELS[step.direction] : ''))
    .filter(Boolean)
    .join(' → ')
}

/** Число шагов заданного направления в цепочке (null-шаги не считаются). */
function countOf(
  steps: readonly (KinshipStepDirection | null)[],
  direction: KinshipStepDirection,
): number {
  return steps.reduce((count, step) => (step === direction ? count + 1 : count), 0)
}

/** Моноотонность сегмента пути: только `up` или только `down` (пустой сегмент — моноотонный). */
function isMonotone(steps: readonly (KinshipStepDirection | null)[]): boolean {
  const hasUp = steps.some((step) => step === 'up')
  const hasDown = steps.some((step) => step === 'down')
  return !(hasUp && hasDown)
}

/** Термин сводного родства для `[spouse, up]`: родители супруга якоря. */
function spouseParentTerm(anchorGender: Gender): string {
  if (anchorGender === Gender.MALE) return byGender(Gender.UNKNOWN, 'тесть', 'тёща')
  if (anchorGender === Gender.FEMALE) return byGender(Gender.UNKNOWN, 'свёкор', 'свекровь')
  return 'тесть или свёкор'
}

/** Термин сводного родства для `[down, spouse]`: супруг ребёнка якоря. */
function childSpouseTerm(childGender: Gender): string {
  if (childGender === Gender.MALE) return 'невестка'
  if (childGender === Gender.FEMALE) return 'зять'
  return 'зять или невестка'
}

/** Термин сводного родства для `[spouse, up, down]`: брат/сестра супруга якоря. */
function spouseSiblingTerm(targetGender: Gender): string {
  if (targetGender === Gender.MALE) return 'шурин'
  if (targetGender === Gender.FEMALE) return 'золовка'
  return 'шурин или золовка'
}

/** Термин для потомка на `downs` поколений ниже (Расширенный). */
function descendantTerm(downs: number, gender: Gender): string | null {
  if (downs === 1) return byGender(gender, 'сын', 'дочь')
  if (downs === 2) return byGender(gender, 'внук', 'внучка')
  if (downs >= 3) {
    const prefix = 'пра'.repeat(downs - 2)
    return byGender(gender, `${prefix}внук`, `${prefix}внучка`)
  }
  return null
}

/** Склоняет кровный термин в родительный падеж для конструкций «муж/жена X». */
function genitiveOf(form: string, gender: Gender): string {
  let result = form
    .replace(/брат$/, 'брата')
    .replace(/сестра$/, 'сестры')
    .replace(/племянник$/, 'племянника')
    .replace(/племянница$/, 'племянницы')
    .replace(/внук$/, 'внука')
    .replace(/внучка$/, 'внучки')
    .replace(/сын$/, 'сына')
    .replace(/дочь$/, 'дочери')
  // Сложные формы вида «внучатая племянница» → «внучатой племянницы»
  if (gender === Gender.FEMALE) result = result.replace(/ая /, 'ой ')
  return result
}

/** Хелпер для получения числительного в правильном регистре (2-е, 3-е, 4-е) */
function formatGenerationNode(num: number): string {
  if (num === 2) return '2-е'
  if (num === 3) return '3-е'
  return `${num}-е`
}

// export function describeKinship(
//   persons: Record<string, Person>,
//   path: KinshipPath,
// ): KinshipDescription {
//   if (path.distance === 0) return { label: 'одна и та же персона', exact: true }

//   // 1. Сбор исходных направлений
//   const directions = path.steps
//     .slice(1)
//     .map((step) => step.direction)
//     .filter((d): d is KinshipStepDirection => d !== null)

//   // 2. Рекурсивное сжатие технических мостов многоженства
//   let collapsed = true
//   while (collapsed) {
//     collapsed = false
//     for (let i = 0; i < directions.length - 1; i++) {
//       if (directions[i] === 'spouse' && directions[i + 1] === 'down') {
//         directions.splice(i, 2, 'down')
//         collapsed = true
//         break
//       }
//       if (directions[i] === 'up' && directions[i + 1] === 'spouse') {
//         directions.splice(i, 2, 'up')
//         collapsed = true
//         break
//       }
//     }
//   }

//   // 3. Базовые метрики пути
//   const spouseCount = countOf(directions, 'spouse')
//   if (spouseCount >= 2) return { label: fallbackChain(path), exact: false }

//   const anchorId = path.steps[0]!.personId
//   const anchorGender = persons[anchorId]?.gender ?? Gender.UNKNOWN
//   const targetId = path.steps[path.steps.length - 1]!.personId
//   const targetGender = persons[targetId]?.gender ?? Gender.UNKNOWN

//   // Расчет колен: шаги вверх + шаги вниз (для супругов считаем по их кровной половинке)
//   const ups = countOf(directions, 'up')
//   const downs = countOf(directions, 'down')
//   const degreeOfKinship = ups + downs

//   // --- СЛУЧАЙ 1: ЧИСТО КРОВНОЕ РОДСТВО ---
//   if (spouseCount === 0) {
//     const firstUp = directions.indexOf('up')
//     if (firstUp !== -1 && directions.slice(0, firstUp).includes('down')) {
//       return { label: fallbackChain(path), exact: false }
//     }

//     let label: string | null = null
//     if (ups > 0 && downs === 0) label = ancestorTerm(ups, targetGender)
//     else if (ups === 0 && downs > 0) label = descendantTerm(downs, targetGender)
//     else label = collateralTerm(ups, downs, targetGender)

//     if (label) {
//       return {
//         label: `${label} (${formatGenerationNode(degreeOfKinship)} колено)`,
//         exact: true,
//       }
//     }
//     return { label: fallbackChain(path), exact: false }
//   }

//   // --- СЛУЧАЙ 2: РОДСТВО ЧЕРЕЗ ОДИН БРАК (СВОЙСТВО) ---
//   const spouseIndex = directions.indexOf('spouse')!
//   const before = directions.slice(0, spouseIndex)
//   const after = directions.slice(spouseIndex + 1)

//   const beforeUps = countOf(before, 'up')
//   const beforeDowns = countOf(before, 'down')
//   const afterUps = countOf(after, 'up')
//   const afterDowns = countOf(after, 'down')

//   // Точные базовые сводные термины (Ближайшие свойственники)
//   if (before.length === 0 && after.length === 1 && after[0] === 'up') {
//     return { label: `${spouseParentTerm(anchorGender)} (в силу брака)`, exact: true }
//   }
//   if (before.length === 1 && before[0] === 'down' && after.length === 0) {
//     const childStep = path.steps[path.steps.length - 2]
//     const childGender = childStep
//       ? (persons[childStep.personId]?.gender ?? Gender.UNKNOWN)
//       : Gender.UNKNOWN
//     return { label: `${childSpouseTerm(childGender)} (в силу брака)`, exact: true }
//   }
//   if (before.length === 0 && after.length === 2 && after[0] === 'up' && after[1] === 'down') {
//     return { label: `${spouseSiblingTerm(targetGender)} (в силу брака)`, exact: true }
//   }

//   if (!isMonotone(before) || !isMonotone(after)) return { label: fallbackChain(path), exact: false }

//   // [spouse] — прямой супруг(а)
//   if (before.length === 0 && after.length === 0) {
//     return { label: byGender(targetGender, 'супруг', 'супруга'), exact: true }
//   }

//   // Супруг(а) вашего кровного потомка (`[downⁿ, spouse]`) с правильным склонением
//   if (after.length === 0 && beforeUps === 0 && beforeDowns > 0) {
//     const descendantStep = path.steps[path.steps.length - 2]
//     const descendantGender = descendantStep
//       ? (persons[descendantStep.personId]?.gender ?? Gender.UNKNOWN)
//       : Gender.UNKNOWN

//     const maleForm = descendantTerm(beforeDowns, Gender.MALE)
//     const femaleForm = descendantTerm(beforeDowns, Gender.FEMALE)

//     let relativeGenitive = 'потомка'
//     if (maleForm && femaleForm) {
//       const maleGenitive = `${maleForm}а`
//       const femaleGenitive = femaleForm.replace(/ка$/, 'ки')
//       relativeGenitive =
//         descendantGender === Gender.MALE
//           ? maleGenitive
//           : descendantGender === Gender.FEMALE
//             ? femaleGenitive
//             : `${maleGenitive} или ${femaleGenitive}`
//     }

//     return {
//       // Колено считается по кровной линии якоря (ups + downs, шаг брака не учитывается)
//       label: `${byGender(targetGender, 'муж', 'жена')} ${relativeGenitive} (${formatGenerationNode(degreeOfKinship)} колено)`,
//       exact: true,
//     }
//   }

//   return { label: fallbackChain(path), exact: false }
// }

export function describeKinship(
  persons: Record<string, Person>,
  path: KinshipPath,
): KinshipDescription {
  if (path.distance === 0) return { label: 'одна и та же персона', exact: true }

  // 1. Сбор исходных направлений
  const rawDirections = path.steps
    .slice(1)
    .map((step) => step.direction)
    .filter((d): d is KinshipStepDirection => d !== null)

  // 2. Рекурсивное сжатие технических мостов многоженства
  const directions = [...rawDirections]
  let collapsed = true
  while (collapsed) {
    collapsed = false
    for (let i = 0; i < directions.length - 1; i++) {
      if (directions[i] === 'spouse' && directions[i + 1] === 'down') {
        directions.splice(i, 2, 'down')
        collapsed = true
        break
      }
      if (directions[i] === 'up' && directions[i + 1] === 'spouse') {
        directions.splice(i, 2, 'up')
        collapsed = true
        break
      }
    }
  }

  // 3. Базовые метрики ПОСЛЕ сжатия технических мостов
  const spouseCount = countOf(directions, 'spouse')
  if (spouseCount >= 2) return { label: fallbackChain(path), exact: false }

  const anchorId = path.steps[0]!.personId
  const anchorGender = persons[anchorId]?.gender ?? Gender.UNKNOWN
  const targetId = path.steps[path.steps.length - 1]!.personId
  const targetGender = persons[targetId]?.gender ?? Gender.UNKNOWN

  // Считаем колено по исходному графу для вывода в интерфейсе
  const totalUps = countOf(rawDirections, 'up')
  const totalDowns = countOf(rawDirections, 'down')
  const degreeOfKinship = totalUps + totalDowns

  // --- СЛУЧАЙ 1: ЧИСТО КРОВНОЕ РОДСТВО (После сжатия мостов браков нет) ---
  if (spouseCount === 0) {
    const firstUp = directions.indexOf('up')
    if (firstUp !== -1 && directions.slice(0, firstUp).includes('down')) {
      return { label: fallbackChain(path), exact: false }
    }

    let label: string | null = null
    if (totalUps > 0 && totalDowns === 0) label = ancestorTerm(totalUps, targetGender)
    else if (totalUps === 0 && totalDowns > 0) label = descendantTerm(totalDowns, targetGender)
    else label = collateralTerm(totalUps, totalDowns, targetGender)

    if (label) {
      return {
        label: `${label} (${formatGenerationNode(degreeOfKinship)} колено)`,
        exact: true,
      }
    }
    return { label: fallbackChain(path), exact: false }
  }

  // --- СЛУЧАЙ 2: РОДСТВО ЧЕРЕЗ ОДИН РЕАЛЬНЫЙ БРАК (СВОЙСТВО) ---
  // Проверяем, где именно находится этот брак
  const spouseIndex = directions.indexOf('spouse')!

  // А) Прямой супруг(а) [spouse]
  if (directions.length === 1) {
    return { label: byGender(targetGender, 'супруг', 'супруга'), exact: true }
  }

  // Б) Ближайшие классические свойственники (фиксированные формы)
  // [spouse, up] — родители супруга
  if (spouseIndex === 0 && directions.length === 2 && directions[1] === 'up') {
    return { label: `${spouseParentTerm(anchorGender)} (в силу брака)`, exact: true }
  }
  // [spouse, up, down] — брат/сестра супруга
  if (
    spouseIndex === 0 &&
    directions.length === 3 &&
    directions[1] === 'up' &&
    directions[2] === 'down'
  ) {
    return { label: `${spouseSiblingTerm(targetGender)} (в силу брака)`, exact: true }
  }

  // В1) Супруг(а) ребёнка якоря ([down, spouse]) — фиксированные формы невестки/зятя
  if (spouseIndex === directions.length - 1 && directions.length === 2 && directions[0] === 'down') {
    const childStep = path.steps[path.steps.length - 2]
    const childGender = childStep
      ? (persons[childStep.personId]?.gender ?? Gender.UNKNOWN)
      : Gender.UNKNOWN
    return { label: `${childSpouseTerm(childGender)} (в силу брака)`, exact: true }
  }

  // В2) Супруг(а) кровного родственника якоря — брак в самом конце пути ([downⁿ, spouse])
  if (spouseIndex === directions.length - 1) {
    const beforeSpouse = rawDirections.slice(0, rawDirections.length - 1)

    // Немоноотонный сегмент до брака («муж/жена X» не существует) → fallback-цепочка
    if (!isMonotone(beforeSpouse)) return { label: fallbackChain(path), exact: false }

    // Находим предпоследний шаг — это наш кровный родственник
    const relativeStep = path.steps[path.steps.length - 2]
    const relativeGender = relativeStep
      ? (persons[relativeStep.personId]?.gender ?? Gender.UNKNOWN)
      : Gender.UNKNOWN

    const bloodUps = countOf(beforeSpouse, 'up')
    const bloodDowns = countOf(beforeSpouse, 'down')

    const termFor = (g: Gender): string | null => {
      if (bloodUps > 0 && bloodDowns === 0) return ancestorTerm(bloodUps, g)
      if (bloodUps === 0 && bloodDowns > 0) return descendantTerm(bloodDowns, g)
      return collateralTerm(bloodUps, bloodDowns, g)
    }

    const maleForm = termFor(Gender.MALE)
    const femaleForm = termFor(Gender.FEMALE)
    if (maleForm || femaleForm) {
      // Родительный падеж: известное поле — одна форма, неизвестное — «X или Y» по обеим формам
      let genitiveLabel: string
      if (relativeGender === Gender.MALE && maleForm) {
        genitiveLabel = genitiveOf(maleForm, Gender.MALE)
      } else if (relativeGender === Gender.FEMALE && femaleForm) {
        genitiveLabel = genitiveOf(femaleForm, Gender.FEMALE)
      } else {
        genitiveLabel = [maleForm, femaleForm]
          .filter((form): form is string => form !== null)
          .map((form, idx) => genitiveOf(form, idx === 0 ? Gender.MALE : Gender.FEMALE))
          .join(' или ')
      }

      const spouseWord = byGender(targetGender, 'муж', 'жена')
      return {
        label: `${spouseWord} ${genitiveLabel} (${formatGenerationNode(degreeOfKinship)} колено)`,
        exact: true,
      }
    }
  }

  // Г) Прозрачный мост предков через супруга ([upⁿ, spouse])
  if (spouseIndex === directions.length - 1 && totalDowns === 0 && totalUps > 0) {
    const label = ancestorTerm(totalUps, targetGender)
    if (label)
      return { label: `${label} (${formatGenerationNode(degreeOfKinship)} колено)`, exact: true }
  }

  // Д) Прозрачный мост потомков через супруга ([spouse, downⁿ])
  if (spouseIndex === 0 && totalUps === 0 && totalDowns > 0) {
    const label = descendantTerm(totalDowns, targetGender)
    if (label)
      return { label: `${label} (${formatGenerationNode(degreeOfKinship)} колено)`, exact: true }
  }

  return { label: fallbackChain(path), exact: false }
}
