export async function computeAverageLuminance(dataUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxSize = 64;
      const scale = Math.min(1, maxSize / img.naturalWidth, maxSize / img.naturalHeight);
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(0);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height).data;

      let luminanceSum = 0;
      let pixelCount = 0;

      for (let i = 0; i < imageData.length; i += 4) {
        const alpha = imageData[i + 3] / 255;
        if (alpha === 0) continue;

        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        luminanceSum += luminance * alpha;
        pixelCount += alpha;
      }

      resolve(pixelCount > 0 ? luminanceSum / pixelCount : 0);
    };

    img.onerror = () => reject(new Error('Failed to decode image for luminance analysis.'));
    img.src = dataUrl;
  });
}
