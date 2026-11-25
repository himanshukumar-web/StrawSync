const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB pre-compression guard
const MAX_WIDTH_PX = 800;
const JPEG_QUALITY = 0.75;

/**
 * Validates and compresses a browser image File via HTML5 canvas into a compact JPEG data URL
 * so localStorage quota is respected across multiple uploaded product photos.
 */
export function compressProductImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      reject(new Error('Unsupported file format. Please upload a JPEG, PNG, or WebP image.'));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(new Error('Image file is too large (max 10 MB before compression).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or corrupted image file.'));
      img.onload = () => {
        const scale = img.width > MAX_WIDTH_PX ? MAX_WIDTH_PX / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser canvas is unavailable for image compression.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
