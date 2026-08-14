const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);

export const MAX_ATTACHMENT_COUNT = 3;
export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_SIZE_MB = 5;

export function isImageFile(file: File): boolean {
  return IMAGE_MIME_TYPES.has(file.type);
}

export function isWithinSizeLimit(file: File): boolean {
  return file.size <= MAX_ATTACHMENT_SIZE_BYTES;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function filesToBase64Attachments(files: File[]): Promise<string[]> {
  const results: string[] = [];
  for (const file of files) {
    if (!isWithinSizeLimit(file)) {
      throw new Error('file_too_large');
    }
    results.push(await readFileAsDataUrl(file));
  }
  return results;
}
