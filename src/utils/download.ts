/**
 * Скачивает Blob как файл с указанным именем (общий хелпер для экспорта JSON и PNG).
 * @param {Blob} blob - данные для скачивания
 * @param {string} filename - имя результирующего файла
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
