import Konva from 'konva'
import logoSvgUrl from '@/assets/Deev-Family-Symbol-free.svg'
import { downloadBlob } from './download'

// Запас по краям экспортного бокса (px): тень карточки (shadowBlur: 16) должна
// целиком помещаться внутри canvas — иначе на PNG появляется жёсткий вертикальный
// обрез тени у границы экспорта.
const EXPORT_PADDING = 40

/**
 * Экспорт сцены в PNG (фикс T8.5): клонирует stage, ждёт загрузки логотипа
 * (без setTimeout), добавляет белый фон и логотип до `toBlob`, скачивает файл.
 * @param {Konva.Stage} stage - исходная сцена
 * @returns {Promise<void>} резолвится после начала скачивания, отклоняется при ошибке
 */
export function exportStageToPng(stage: Konva.Stage): Promise<void> {
  return new Promise((resolve, reject) => {
    const tempStage = stage.clone()
    const cleanup = () => tempStage.destroy()

    try {
      // Сбрасываем масштаб и смещение клона для расчёта в мировых координатах
      tempStage.scale({ x: 1, y: 1 })
      tempStage.position({ x: 0, y: 0 })

      const contentBox = tempStage.getClientRect({ skipTransform: false })
      // Бокс экспорта = контент + паддинг со всех сторон, округлённый до целых
      // пикселей (убирает субпиксельный сдвиг внутри Node._toKonvaCanvas).
      const exportBox = {
        x: Math.floor(contentBox.x - EXPORT_PADDING),
        y: Math.floor(contentBox.y - EXPORT_PADDING),
        width: Math.ceil(contentBox.width + EXPORT_PADDING * 2),
        height: Math.ceil(contentBox.height + EXPORT_PADDING * 2),
      }
      const layer = tempStage.getLayers()[0]
      if (!layer) throw new Error('В сцене нет слоёв для экспорта')

      Konva.Image.fromURL(
        logoSvgUrl,
        (logo) => {
          try {
            logo
              .width(50)
              .height(50)
              .position({
                x: contentBox.x + 10,
                y: contentBox.y + contentBox.height - 60,
              })

            const background = new Konva.Rect({
              x: exportBox.x,
              y: exportBox.y,
              width: exportBox.width,
              height: exportBox.height,
              fill: 'white',
              listening: false, // чтобы не мешал кликам
            })
            layer.add(background)
            background.moveToBottom()
            layer.add(logo)
            layer.draw()

            tempStage.toBlob({
              x: exportBox.x,
              y: exportBox.y,
              width: exportBox.width,
              height: exportBox.height,
              pixelRatio: 2,
              callback: (blob: Blob | null): void => {
                try {
                  if (!blob) throw new Error('Не удалось создать PNG из сцены')
                  downloadBlob(blob, 'exported_image.png')
                  resolve()
                } catch (e) {
                  reject(e)
                } finally {
                  cleanup()
                }
              },
            })
          } catch (e) {
            cleanup()
            reject(e)
          }
        },
        () => {
          cleanup()
          reject(new Error('Не удалось загрузить логотип'))
        },
      )
    } catch (e) {
      cleanup()
      reject(e)
    }
  })
}
