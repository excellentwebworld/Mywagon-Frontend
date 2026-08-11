const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);

export function isImageFile(file: File): boolean {
  return IMAGE_MIME_TYPES.has(file.type);
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
    results.push(await readFileAsDataUrl(file));
  }
  return results;
}
