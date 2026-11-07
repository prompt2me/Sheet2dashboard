/**
 * Client-Side Image Resizer & Optimizer for Vision OCR
 * Downscales multi-megapixel mobile photos & screenshots to optimal dimensions (max 1600px)
 * and compresses to lightweight JPEG (~150KB-300KB) to prevent network payload truncation.
 */

export async function compressImageForOcr(
  fileOrBase64: File | string,
  maxDimension = 1600,
  quality = 0.85
): Promise<{
  base64: string;
  mimeType: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Scale down if dimensions exceed maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback: return uncompressed
        const rawBase64 = typeof fileOrBase64 === 'string' ? fileOrBase64 : '';
        resolve({
          base64: rawBase64,
          mimeType: 'image/jpeg',
          originalSizeKB: Math.round(rawBase64.length / 1024),
          compressedSizeKB: Math.round(rawBase64.length / 1024),
          width: img.width,
          height: img.height,
        });
        return;
      }

      // Draw with white background in case of transparent PNGs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      const cleanBase64 = compressedDataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

      const approxSizeKB = Math.round((cleanBase64.length * 3) / 4 / 1024);

      resolve({
        base64: compressedDataUrl,
        mimeType: 'image/jpeg',
        originalSizeKB: typeof fileOrBase64 === 'string' ? Math.round(fileOrBase64.length / 1024) : Math.round(fileOrBase64.size / 1024),
        compressedSizeKB: approxSizeKB,
        width,
        height,
      });
    };

    img.onerror = (err) => {
      reject(new Error('Failed to load image for compression: ' + err));
    };

    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrBase64);
    }
  });
}
