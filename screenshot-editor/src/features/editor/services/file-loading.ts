export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function readImageFiles(files: FileList | File[], limit = 2): Promise<string[]> {
  const imageFiles = Array.from(files)
    .filter((file) => file.type.startsWith('image/'))
    .slice(0, limit);

  if (imageFiles.length === 0) return [];
  return Promise.all(imageFiles.map(readFileAsDataUrl));
}

export function getImageDimensions(dataUrl: string): Promise<{width: number; height: number}> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      resolve({width: image.naturalWidth, height: image.naturalHeight});
    };
    image.onerror = () => reject(new Error('Failed to load image dimensions.'));
    image.src = dataUrl;
  });
}
