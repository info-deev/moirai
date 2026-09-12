// utils/kinshipTerminology.ts
import { Gender, type Person } from '@/types/types'
import type { KinshipPath, KinshipStepDirection } from './kinshipPath'

export interface KinshipDescription {
  label: string
  exact: boolean
}

/** Подставляет род целевой персоны (MALE/FEMALE) */
function byGender(gender: Gender, male: string, female: string): string {
  if (gender === Gender.MALE) return male
  if (gender === Gender.FEMALE) return female
  return `${male} или ${female}`
}

/** Термин для прямого предка на `ups` поколений выше */
function ancestorTerm(ups: number, gender: Gender): string {
  if (ups === 1) return byGender(gender, 'отец', 'мать')
  if (ups === 2) return byGender(gender, 'дед', 'бабка')
  const prefix = 'пра'.repeat(ups - 2)
  return byGender(gender, `${prefix}дед`, `${prefix}бабка`)
}

/** Термин для прямого потомка на `downs` поколений ниже */
function descendantTerm(downs: number, gender: Gender): string | null {
  if (downs === 1) return byGender(gender, 'сын', 'дочь')
  if (downs === 2) return byGender(gender, 'внук', 'внучка')
  if (downs >= 3) {
    const prefix = 'пра'.repeat(downs - 2)
    return byGender(gender, `${prefix}внук`, `${prefix}внучка`)
  }
  return null
}

/**
 * Термин для бокового родства (up* → down*).
 * Исправленная и выверенная генеалогическая матрица.
 */
function collateralTerm(ups: number, downs: number, gender: Gender): string | null {
  // --- 1. ОДНО ПОКОЛЕНИЕ (Родные, двоюродные и т.д. братья и сестры) ---
  if (ups === downs) {
    if (ups === 1) return byGender(gender, 'брат', 'сестра')
    if (ups === 2) return byGender(gender, 'двоюродный брат', 'двоюродная сестра')
    if (ups === 3) return byGender(gender, 'троюродный брат', 'троюродная сестра')

    const prefixes = ['четвероюродный', 'пятиюродный', 'шестиюродный', 'семиюродный']
    const pref = prefixes[ups - 4] || `${ups}-юродный`
    return byGender(gender, `${pref} брат`, `${pref} сестра`)
  }

  // --- 2. ПОТОМКИ БРАТЬЕВ/СЕСТЕР (Младшее поколение: племянники) ---
  if (downs > ups) {
    const diff = downs - ups // На сколько поколений ниже вас целевая персона

    // Родные племянники (общие предки — ваши родители, т.е. ups === 1)
    if (ups === 1) {
      if (diff === 1) return byGender(gender, 'племянник', 'племянница')
      if (diff === 2) return byGender(gender, 'внучатый племянник', 'внучатая племянница')

      const prefix = 'пра'.repeat(diff - 2)
      return byGender(gender, `${prefix}внучатый племянник`, `${prefix}внучатая племянница`)
    }

    // Двоюродные/троюродные племянники (ups >= 2)
    const degreeWordsMale = ['', 'двоюродный', 'троюродный', 'четвероюродный', 'пятиюродный']
    const degreeWordsFemale = ['', 'двоюродная', 'троюродная', 'четвероюродная', 'пятиюродная']

    const degree =
      gender === Gender.MALE
        ? degreeWordsMale[ups] || `${ups}-юродный`
        : degreeWordsFemale[ups] || `${ups}-юродная`

    if (diff === 1) return byGender(gender, `${degree} племянник`, `${degree} племянница`)
    if (diff === 2)
      return byGender(gender, `${degree} внучатый племянник`, `${degree} внучатая племянница`)

    const prefix = 'пра'.repeat(diff - 2)
    return byGender(
      gender,
      `${degree} ${prefix}внучатый племянник`,
      `${degree} ${prefix}внучатая племянница`,
    )
  }

  // --- 3. ПРЕДКИ БРАТЬЕВ/СЕСТЕР (Старшее поколение: дяди, тёти, дедушки) ---
  if (ups > downs) {
    const diff = ups - downs // На сколько поколений выше вас целевая персона

    // Родные дяди и тёти (общие предки — ваши дедушка/бабушка, т.е. downs === 1)
    if (downs === 1) {
      if (diff === 1) return byGender(gender, 'дядя', 'тётя')
      if (diff === 2) return byGender(gender, 'двоюродный дедушка', 'двоюродная бабушка')

      const prefix = 'пра'.repeat(diff - 2)
      return byGender(gender, `двоюродный ${prefix}дедушка`, `двоюродная ${prefix}бабушка`)
    }

    // Двоюродные / троюродные дяди и тёти (downs >= 2)
    const degreeWords = ['', 'двоюродный', 'троюродный', 'четвероюродный', 'пятиюродный']
    const degree = degreeWords[downs] || `${downs}-юродный`

    if (diff === 1) return byGender(gender, `${degree} дядя`, `${degree} тётя`)

    const prefix = 'пра'.repeat(diff - 1)
    return byGender(gender, `${degree} ${prefix}дедушка`, `${degree} ${prefix}бабушка`)
  }

  return null
}

/** Склоняет чистый кровный термин в родительный падеж для конструкций «муж/жена X» */
function convertToGenitive(text: string, gender: Gender): string {
  let result = text

  if (gender === Gender.MALE) {
    result = result
      .replace(/двоюродный/g, 'двоюродного')
      .replace(/троюродный/g, 'троюродного')
      .replace(/четвероюродный/g, 'четвероюродного')
      .replace(/пятиюродный/g, 'пятиюродного')
      .replace(/-юродный/g, '-юродного')
      .replace(/брат$/g, 'брата')
      .replace(/племянник$/g, 'племянника')
      .replace(/сын$/g, 'сына')
      .replace(/внук$/g, 'внука')
      .replace(/дядя$/g, 'дяди')
      .replace(/дедушка$/g, 'дедушки')
  } else {
    result = result
      .replace(/двоюродная/g, 'двоюродной')
      .replace(/троюродная/g, 'троюродной')
      .replace(/четвероюродная/g, 'четвероюродной')
      .replace(/пятиюродная/g, 'пятиюродной')
      .replace(/-юродная/g, '-юродной')
      .replace(/внучатая/g, 'внучатой')
      .replace(/сестра$/g, 'сестры')
      .replace(/племянница$/g, 'племянницы')
      .replace(/дочь$/g, 'дочери')
      .replace(/внучка$/g, 'внучки')
      .replace(/тётя$/g, 'тёти')
      .replace(/бабушка$/g, 'бабушки')
  }
  return result
}

const STEP_LABELS: Record<KinshipStepDirection, string> = {
  up: 'родитель',
  down: 'ребёнок',
  spouse: 'супруг',
}

function fallbackChain(path: KinshipPath): string {
  return path.steps
    .slice(1)
    .map((step) => (step.direction ? STEP_LABELS[step.direction] : ''))
    .filter(Boolean)
    .join(' → ')
}

function countOf(
  steps: readonly (KinshipStepDirection | null)[],
  direction: KinshipStepDirection,
): number {
  return steps.reduce((count, step) => (step === direction ? count + 1 : count), 0)
}

function formatGenerationNode(num: number): string {
  return `${num}-е`
}

function spouseParentTerm(anchorGender: Gender): string {
  if (anchorGender === Gender.MALE) return byGender(Gender.UNKNOWN, 'тесть', 'тёща')
  if (anchorGender === Gender.FEMALE) return byGender(Gender.UNKNOWN, 'свёкор', 'свекровь')
  return 'тесть или свёкор'
}

function spouseSiblingTerm(targetGender: Gender): string {
  if (targetGender === Gender.MALE) return 'шурин'
  if (targetGender === Gender.FEMALE) return 'золовка'
  return 'шурин или золовка'
}

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

  // Метрики ПОСЛЕ сжатия
  const spouseCount = countOf(directions, 'spouse')

  // Если браков 3 и более — это уже слишком глубокая цепочка, отдаем fallback
  if (spouseCount >= 3) return { label: fallbackChain(path), exact: false }

  const anchorId = path.steps[0]!.personId
  const anchorGender = persons[anchorId]?.gender ?? Gender.UNKNOWN
  const targetId = path.steps[path.steps.length - 1]!.personId
  const targetGender = persons[targetId]?.gender ?? Gender.UNKNOWN
  const degreeOfKinship = countOf(rawDirections, 'up') + countOf(rawDirections, 'down')

  // --- СЛУЧАЙ 1: ЧИСТО КРОВНОЕ РОДСТВО (0 браков после сжатия) ---
  if (spouseCount === 0) {
    const firstUp = directions.indexOf('up')
    if (firstUp !== -1 && directions.slice(0, firstUp).includes('down')) {
      return { label: fallbackChain(path), exact: false }
    }

    let label: string | null = null
    const totalUps = countOf(directions, 'up')
    const totalDowns = countOf(directions, 'down')

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

  // --- СЛУЧАЙ 2: ОДИН КЛАССИЧЕСКИЙ ПРЯМОЙ БРАК (1 шаг в цепочке) ---
  if (directions.length === 1 && spouseCount === 1) {
    return { label: byGender(targetGender, 'супруг', 'супруга'), exact: true }
  }

  // --- СЛУЧАЙ 3: ДВА БРАКА ЛОБ В ЛОБ (Вы и супруг(а) — родственники супругов родственников) ---
  // Пример: Слева [spouse] (мой муж) -> кровный путь -> [spouse] (жена его двоюродного брата)
  const firstSpouseIndex = directions.indexOf('spouse')
  const lastSpouseIndex = directions.lastIndexOf('spouse')

  if (spouseCount === 2) {
    // Проверяем, что один брак в начале, а второй в конце. Если они кучно в куче — это fallback
    if (firstSpouseIndex !== 0 || lastSpouseIndex !== directions.length - 1) {
      return { label: fallbackChain(path), exact: false }
    }

    // Извлекаем пол вашего супруга(и)
    const mySpouseStep = path.steps[1]
    const mySpouseGender = mySpouseStep
      ? (persons[mySpouseStep.personId]?.gender ?? Gender.UNKNOWN)
      : Gender.UNKNOWN
    const mySpouseWord = byGender(mySpouseGender, 'мужа', 'жены')

    // Извлекаем пол родственника, чья жена/муж нас интересует (предпоследний шаг)
    const relativeStep = path.steps[path.steps.length - 2]
    const relativeGender = relativeStep
      ? (persons[relativeStep.personId]?.gender ?? Gender.UNKNOWN)
      : Gender.UNKNOWN

    // Чистый кровный путь МЕЖДУ двумя браками
    const midDirections = directions.slice(1, -1)
    const bloodUps = countOf(midDirections, 'up')
    const bloodDowns = countOf(midDirections, 'down')

    let bloodLabel: string | null = null
    if (bloodUps > 0 && bloodDowns === 0) bloodLabel = ancestorTerm(bloodUps, relativeGender)
    else if (bloodUps === 0 && bloodDowns > 0)
      bloodLabel = descendantTerm(bloodDowns, relativeGender)
    else bloodLabel = collateralTerm(bloodUps, bloodDowns, relativeGender)

    if (bloodLabel) {
      const term = byGender(targetGender, 'невестка', 'зять') // Для жены брата — невестка, для мужа сестры — зять
      const spouseWord = byGender(targetGender, 'жена', 'муж')
      const genitiveLabel = convertToGenitive(bloodLabel, relativeGender)

      // Результат: "невестка (жена двоюродного брата жены) (X колено)"
      return {
        label: `${term} (${spouseWord} ${genitiveLabel} ${mySpouseWord}) (${formatGenerationNode(degreeOfKinship)} колено)`,
        exact: true,
      }
    }
    return { label: fallbackChain(path), exact: false }
  }

  // --- СЛУЧАЙ 4: РОВНО ОДИН БРАК В СЕРЕДИНЕ/КОНЦЕ/НАЧАЛЕ ПУТИ ---
  if (spouseCount === 1) {
    // А) Родственники вашего супруга ([spouse, up...] или [spouse, down...])
    if (firstSpouseIndex === 0) {
      const mySpouseStep = path.steps[1]
      const mySpouseGender = mySpouseStep
        ? (persons[mySpouseStep.personId]?.gender ?? Gender.UNKNOWN)
        : Gender.UNKNOWN
      const mySpouseWord = byGender(mySpouseGender, 'мужа', 'жены')

      // Особые классические формы близкого свойства
      if (directions.length === 2 && directions[1] === 'up') {
        return { label: `${spouseParentTerm(anchorGender)} (в силу брака)`, exact: true }
      }
      if (directions.length === 3 && directions[1] === 'up' && directions[2] === 'down') {
        return { label: `${spouseSiblingTerm(targetGender)} (в силу брака)`, exact: true }
      }

      // Универсальный просчет дальних кровных родственников вашего супруга(и)
      const bloodDirections = directions.slice(1)
      const bloodUps = countOf(bloodDirections, 'up')
      const bloodDowns = countOf(bloodDirections, 'down')

      let bloodLabel: string | null = null
      if (bloodUps > 0 && bloodDowns === 0) bloodLabel = ancestorTerm(bloodUps, targetGender)
      else if (bloodUps === 0 && bloodDowns > 0)
        bloodLabel = descendantTerm(bloodDowns, targetGender)
      else bloodLabel = collateralTerm(bloodUps, bloodDowns, targetGender)

      if (bloodLabel) {
        return {
          label: `${bloodLabel} ${mySpouseWord} (${formatGenerationNode(degreeOfKinship)} колено)`,
          exact: true,
        }
      }
    }

    // Б) Супруги ваших кровных родственников (...кровный путь... -> [spouse])
    if (firstSpouseIndex === directions.length - 1) {
      const relativeStep = path.steps[path.steps.length - 2]
      const relativeGender = relativeStep
        ? (persons[relativeStep.personId]?.gender ?? Gender.UNKNOWN)
        : Gender.UNKNOWN

      const bloodDirections = directions.slice(0, -1)
      const bloodUps = countOf(bloodDirections, 'up')
      const bloodDowns = countOf(bloodDirections, 'down')

      let bloodLabel: string | null = null
      if (bloodUps > 0 && bloodDowns === 0) bloodLabel = ancestorTerm(bloodUps, relativeGender)
      else if (bloodUps === 0 && bloodDowns > 0)
        bloodLabel = descendantTerm(bloodDowns, relativeGender)
      else bloodLabel = collateralTerm(bloodUps, bloodDowns, relativeGender)

      if (bloodLabel) {
        const term = byGender(targetGender, 'зять', 'невестка')
        const spouseWord = byGender(targetGender, 'муж', 'жена')
        const genitiveLabel = convertToGenitive(bloodLabel, relativeGender)

        return {
          label: `${term} (${spouseWord} ${genitiveLabel}) (${formatGenerationNode(degreeOfKinship)} колено)`,
          exact: true,
        }
      }
    }
  }

  return { label: fallbackChain(path), exact: false }
}
