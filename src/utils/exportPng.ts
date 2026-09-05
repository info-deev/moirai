import Konva from 'konva'
import logoSvgUrl from '@/assets/Deev-Family-Symbol-free.svg'
import { downloadBlob } from './download'

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

      const box = tempStage.getClientRect({ skipTransform: false })
      const layer = tempStage.getLayers()[0]
      if (!layer) throw new Error('В сцене нет слоёв для экспорта')

      Konva.Image.fromURL(
        logoSvgUrl,
        (logo) => {
          try {
            logo
              .width(50)
              .height(50)
              .position({ x: box.x + 10, y: box.y + box.height - 60 })

            const background = new Konva.Rect({
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
              fill: 'white',
              listening: false, // чтобы не мешал кликам
            })
            layer.add(background)
            background.moveToBottom()
            layer.add(logo)
            layer.draw()

            tempStage.toBlob({
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
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
