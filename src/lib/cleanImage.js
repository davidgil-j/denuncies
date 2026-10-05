// Treu les dades ocultes d'una foto (EXIF: ubicació GPS, model del dispositiu, data i hora) tornant-la
// a dibuixar en un llenç. S'aplica a les denúncies anònimes abans d'enviar els arxius.
// Només imatges JPEG, PNG i WebP; la resta de formats (PDF, vídeo, documents) es deixen igual
// i el formulari avisa que poden portar dades ocultes.
const CLEANABLE = ['image/jpeg', 'image/png', 'image/webp'];

export async function stripImageMetadata(file) {
  if (!CLEANABLE.includes(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    // 'from-image' aplica l'orientació de l'EXIF abans de descartar-lo: la foto no surt girada
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, file.type, 0.92));
    if (!blob) return file;
    return new File([blob], file.name, { type: file.type, lastModified: 0 });
  } catch {
    // Si el navegador no pot llegir la imatge, s'envia tal com és (el formulari ja n'avisa)
    return file;
  }
}
