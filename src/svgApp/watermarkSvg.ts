export class WatermarkSvg {
  private currentSVGElement;
  private currentCanvas;

  public async addWatermark(divSvgContainer) {
    const currentSVGElement = divSvgContainer.children[0] as SVGElement;

    const watermarkText = 'WATERMARK';

    try {
      // Создаем canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Получаем размеры SVG
      const svgRect = currentSVGElement.getBoundingClientRect();
      canvas.width = svgRect.width || 800;
      canvas.height = svgRect.height || 600;

      // Если SVG не имеет размеров, устанавливаем разумные значения по умолчанию
      if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = 800;
        canvas.height = 600;
      }

      // Конвертируем SVG в data URL
      const svgString = new XMLSerializer().serializeToString(currentSVGElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Ждем загрузки SVG изображения
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = svgUrl;
      });

      // Рисуем SVG на canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Добавляем водяной знак
      this.addWatermarkToCanvas(ctx, canvas.width, canvas.height, watermarkText);

      // Очищаем URL
      URL.revokeObjectURL(svgUrl);

      // Отображаем canvas
      divSvgContainer.innerHTML = '';
      divSvgContainer.appendChild(canvas);
      this.currentCanvas = canvas;
    } catch (error) {
      console.error('Error adding watermark:', error);
    }
  }

  private addWatermarkToCanvas(ctx, width, height, text) {
    ctx.save();

    // Настройки стиля водяного знака
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;

    // Поворачиваем текст
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-45 * Math.PI) / 180);

    // Рисуем текст
    ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);

    // Добавляем дополнительный водяной знак в углу
    ctx.restore();
    ctx.save();

    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, width - 20, height - 20);

    ctx.restore();
  }
}
