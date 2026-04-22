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

export enum Axis {
  X = 'x',
  Y = 'y',
}
