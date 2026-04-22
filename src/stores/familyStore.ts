// stores/familyStore.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

export enum RelationshipType {
  BLOOD = 'blood', // От родителя к ребенку
  ADOPTION = 'adoption', // От усыновителя к ребенку
  MARRIAGE = 'marriage', // Супружество (союз)
}

export interface Person {
  id: string
  x: number
  y: number
  firstName: string
  lastName: string
  gender: Gender
  birthDate?: string
  metadata?: Record<string, any> // Для кастомных полей
}

export interface Relationship {
  id: string
  from: string
  to: string
  type: RelationshipType
  metadata?: Record<string, any> // Для кастомных полей
}

export interface CardSize {
  height: number
  width: number
}

export const CARD_SIZE: CardSize = {
  height: 60,
  width: 160,
}

const debounce = (fn: Function, ms: number) => {
  let timeoutId: ReturnType<typeof setTimeout>

  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
}

export const useFamilyStore = defineStore('family', () => {
  const persons = ref<Record<string, Person>>({})
  const relationships = ref<Record<string, Relationship>>({})

  const updatePosition = (id: string, x: number, y: number) => {
    const person = persons.value[id]
    if (person) {
      person.x = x
      person.y = y
    }
  }
  const debouncedUpdatePosition = debounce((id: string, x: number, y: number) => {
    const person = persons.value[id]
    if (person) {
      person.x = x
      person.y = y
    }
  }, 300)

  const addPerson = (stageRef: any) => {
    const id = self.crypto.randomUUID()
    const stage = stageRef.getStage()
    // Вычисляем центр экрана с учетом текущего зума и смещения
    const x = (window.innerWidth / 2 - stage.x()) / stage.scaleX()
    const y = (window.innerHeight / 2 - stage.y()) / stage.scaleY()
    persons.value[id] = {
      id,
      x: x - CARD_SIZE.width / 2,
      y: y - CARD_SIZE.height / 2,
      firstName: 'UNKNOWN',
      lastName: '',
      gender: Gender.UNKNOWN,
    }
  }

  const addRelationship = (item: Relationship) => {
    relationships.value[item.id] = item
  }

  return {
    persons,
    relationships,
    updatePosition,
    debouncedUpdatePosition,
    addPerson,
    addRelationship,
  }
})
