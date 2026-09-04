// utils/id.ts
/**
 * Единая генерация ID (решение D4): только crypto.randomUUID(), Math.random() запрещён.
 * @returns {string} уникальный идентификатор UUID v4
 */
export const createId = (): string => crypto.randomUUID()
