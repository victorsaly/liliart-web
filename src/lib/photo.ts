/**
 * A photo off a phone is several megabytes and far more detail than the
 * model reads. Shrink it to 768px and a modest JPEG before it goes anywhere:
 * the answer is the same and the upload is quick on a bad connection.
 */

const MAX = 768
const QUALITY = 0.72

export async function toDataUrl(file: File): Promise<{ full: string; small: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const small = canvas.toDataURL('image/jpeg', QUALITY)
  /* the one shown on screen can be a little kinder to the eye */
  const full = canvas.toDataURL('image/jpeg', 0.85)
  return { full, small }
}
