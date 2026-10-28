/* ==========================================================
   RF-01 / 이미지 줄이기 (브라우저 안에서 처리)
   ========================================================== */

export const RESIZE = {
  maxEdge: 3000,                     // 긴 변 최대 (px)
  quality: 0.9,                      // 압축 화질 (0 ~ 1)
  skipBelow: 1.5 * 1024 * 1024,      // 크기가 작고 이 용량 이하면 손대지 않음
}

const EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }

/* 이 브라우저가 WebP로 저장할 수 있는지 (한 번만 확인) */
let webpOk = null
function canEncodeWebp() {
  if (webpOk !== null) return Promise.resolve(webpOk)
  return new Promise((resolve) => {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    c.toBlob(
      (b) => {
        webpOk = !!b && b.type === 'image/webp'
        resolve(webpOk)
      },
      'image/webp',
      0.8,
    )
  })
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/* 이미지 읽기 (사진 회전 정보는 브라우저가 반영해서 읽음) */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('DECODE_FAILED'))
    }
    img.src = url
  })
}

/**
 * 결과: { file, original, resized }
 * - file: 올릴 파일 (줄인 파일 또는 원본)
 * - original: 원본 용량
 * - resized: 줄이거나 다시 압축했는지
 */
export async function processImage(file) {
  const keep = { file, original: file.size, resized: false }

  // GIF: 움직임을 지키려고 그대로
  if (file.type === 'image/gif') return keep

  const { img, url } = await loadImage(file)
  try {
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) throw new Error('DECODE_FAILED')

    const scale = Math.min(1, RESIZE.maxEdge / Math.max(w, h))
    // 이미 작고 가벼우면 손대지 않음
    if (scale === 1 && file.size <= RESIZE.skipBelow) return keep

    const tw = Math.round(w * scale)
    const th = Math.round(h * scale)
    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, tw, th)

    // WebP로 저장할 수 없는 브라우저: JPG는 JPG로, 나머지(투명 가능성)는 PNG로
    let type = 'image/webp'
    if (!(await canEncodeWebp())) type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'

    const blob = await toBlob(canvas, type, RESIZE.quality)

    // 폰 메모리 바로 반납
    canvas.width = 0
    canvas.height = 0

    // 실패했거나 오히려 커졌으면 원본 사용
    if (!blob || blob.size >= file.size) return keep

    const ext = EXT[blob.type] ?? 'webp'
    const name = `${file.name.replace(/\.[^.]+$/, '')}.${ext}`
    return {
      file: new File([blob], name, { type: blob.type, lastModified: Date.now() }),
      original: file.size,
      resized: true,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}