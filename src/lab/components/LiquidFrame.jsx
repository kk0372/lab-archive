import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './liquid.css'

/* ──────────────────────────────────────────────
   조절용 값 (액체 느낌은 여기서만 고치면 됨)
   ────────────────────────────────────────────── */
const CONFIG = {
  speed: 0.35,            // 액체가 움직이는 속도
  maxDpr: 2,              // 화질 상한 (PC)
  maxDprMobile: 1.5,      // 화질 상한 (폰)

  // 본체 액체 모양 (5-A에서 맞춘 값)
  blobSize: 0.33,         // 방울 크기
  blobShrink: 0.03,       // 방울마다 작아지는 정도
  blobMerge: 0.38,        // 녹아 붙는 정도
  blobRange: [0.45, 0.55],// 움직이는 범위 (가로, 세로)

  // 유리 느낌
  rim: 0.25,              // 윤곽선 진하기
  edge: 0.14,             // 가장자리 진해지는 정도
  spec: 0.55,             // 하이라이트

  // 굴절
  refract: 18,            // 가장자리에서 휘는 정도 (px)`
  zoom: 0.94,             // 가운데 확대 (1 = 확대 없음, 작을수록 크게 확대)

  // 이비 방울
  dropSize: 0.11,        // 크기
  dropMagnify: 0.6,       // 안쪽 확대 (작을수록 크게 확대)
  dropCuriosity: 0.3,     // 커서 쪽으로 다가오는 정도 (0 = 무시)

  // 커서
  mouseRadius: 0.22,      // 액체가 밀려나는 범위
}

const rgb = (r, g, b) => new THREE.Vector3(r / 255, g / 255, b / 255)
const rand = (a, b) => a + Math.random() * (b - a)

/* ── 셰이더 ── */
const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAG = /* glsl */ `
uniform vec2 uRes;
uniform float uTime;
uniform float uDpr;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uEvie;
uniform sampler2D uText;
uniform vec3 uBlob;       // size, shrink, merge
uniform vec2 uRange;
uniform vec3 uLook;       // rim, edge, spec
uniform float uRefract;
uniform float uZoom;
uniform vec2 uMouse;
uniform float uMouseAmt;
uniform float uMouseR;
uniform vec3 uDrop;       // x, y, radius
uniform float uDropMag;
varying vec2 vUv;

float sdBox(vec2 p, vec2 h) {
  vec2 d = abs(p) - h;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}
vec4 over(vec4 top, vec4 base) {
  return top + base * (1.0 - top.a);
}

// 본체 액체 (예온)
float liquid(vec2 p) {
  vec2 h = uRes * 0.5;
  vec2 q = p - h;
  float s = min(h.x, h.y);
  float d = 1e5;

  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 o = vec2(
      sin(uTime * (0.70 + fi * 0.13) + fi * 1.7),
      cos(uTime * (0.60 + fi * 0.11) + fi * 2.3)
    );
    vec2 c = o * h * uRange;
    float r = s * (uBlob.x - fi * uBlob.y);
    d = smin(d, length(q - c) - r, s * uBlob.z);
  }

  // 커서가 다가오면 밀려남
  if (uMouseAmt > 0.001) {
    float m = length(p - uMouse) - s * uMouseR * uMouseAmt;
    d = smax(d, -m, s * 0.12 * uMouseAmt + 0.001);
  }

  // 이비 방울을 비켜서 흐름
  float dd = length(p - uDrop.xy) - uDrop.z - 6.0 * uDpr;
  d = smax(d, -dd, s * 0.10);

  // 프레임 벽에 갇힘
  float wall = sdBox(q, h - 1.5 * uDpr);
  return smax(d, wall, s * 0.06);
}

void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 h = uRes * 0.5;
  float aa = uDpr;
  vec2 L = normalize(vec2(-0.55, 0.85));
  vec4 col = vec4(0.0);

  /* ── 본체 액체 ── */
  float d = liquid(p);
  if (d < 4.0 * uDpr) {
    float e = 1.5 * uDpr;
    vec2 g = vec2(
      liquid(p + vec2(e, 0.0)) - liquid(p - vec2(e, 0.0)),
      liquid(p + vec2(0.0, e)) - liquid(p - vec2(0.0, e))
    );
    vec2 n = length(g) > 1e-4 ? normalize(g) : vec2(0.0);

    float inside = 1.0 - smoothstep(-aa, aa, d);
    float depth = clamp(-d / (28.0 * uDpr), 0.0, 1.0);
    float edge = (1.0 - depth) * inside;

    // 굴절: 가운데는 살짝 확대, 가장자리는 크게 휨
    float bend = (1.0 - depth) * (1.0 - depth);
    vec2 sp = h + (p - h) * uZoom + n * uRefract * uDpr * bend;
    float ta = texture2D(uText, sp / uRes).a;

    vec3 glass = mix(uPaper, uEvie, 0.06);
    vec3 body = mix(glass, uInk, ta * 0.9);
    col = vec4(body * inside, inside);

    float ea = edge * edge * uLook.y;
    col = over(vec4(uInk * ea, ea), col);

    float spec = pow(max(dot(n, L), 0.0), 6.0) * smoothstep(0.0, 0.6, edge) * inside;
    float sa = spec * uLook.z;
    col = over(vec4(vec3(sa), sa), col);

    float line = 1.0 - smoothstep(0.35 * uDpr, 1.25 * uDpr, abs(d));
    float la = line * uLook.x;
    col = over(vec4(uInk * la, la), col);
  }

  /* ── 이비 방울 ── */
  vec2 rel = p - uDrop.xy;
  float rl = length(rel);
  float ang = rl > 1e-4 ? atan(rel.y, rel.x) : 0.0;
  float wob = sin(ang * 3.0 + uTime * 5.0) * uDrop.z * 0.04;   // 살짝 출렁임
  float dd = rl - uDrop.z - wob;

  if (dd < 2.0 * uDpr) {
    vec2 gn = rl > 1e-4 ? rel / rl : vec2(0.0);
    float din = 1.0 - smoothstep(-aa, aa, dd);
    float dep = clamp(-dd / uDrop.z, 0.0, 1.0);
    float rimE = pow(1.0 - dep, 3.0);

    // 렌즈처럼 크게 확대
    vec2 sp2 = uDrop.xy + rel * uDropMag;
    float ta2 = texture2D(uText, sp2 / uRes).a;

    vec3 tint = mix(uPaper, uEvie, 0.5);
    vec3 dc = mix(tint, uInk, ta2 * 0.8);
    dc = mix(dc, uEvie * 0.8, rimE * 0.45);
    float spec2 = pow(max(dot(gn, L), 0.0), 8.0) * rimE;
    dc = mix(dc, vec3(1.0), spec2 * 0.7);
    col = over(vec4(dc * din, din), col);

    float l2 = 1.0 - smoothstep(0.35 * uDpr, 1.25 * uDpr, abs(dd));
    float la2 = l2 * uLook.x;
    col = over(vec4(uInk * la2, la2), col);
  }

  gl_FragColor = col;
}
`

export default function LiquidFrame({ titleRef, baselineRef }) {
  const boxRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const box = boxRef.current
    const canvas = canvasRef.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    let disposed = false   // 지워진 뒤에는 아무것도 그리지 않도록

    /* ── WebGL 준비 (실패하면 빈 프레임만) ── */
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        powerPreference: 'low-power',
      })
    } catch (err) {
      console.warn('[RF-01] WebGL unavailable:', err)
      box.classList.add('is-fallback')
      return
    }
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    /* ── 굴절용 타이틀 그림판 ── */
    const textCanvas = document.createElement('canvas')
    textCanvas.width = 2
    textCanvas.height = 2
    const tctx = textCanvas.getContext('2d')
    const texture = new THREE.CanvasTexture(textCanvas)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = false

    const uniforms = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uDpr: { value: 1 },
      uInk: { value: rgb(31, 77, 63) },
      uPaper: { value: rgb(242, 245, 241) },
      uEvie: { value: rgb(140, 214, 176) },
      uText: { value: texture },
      uBlob: { value: new THREE.Vector3(CONFIG.blobSize, CONFIG.blobShrink, CONFIG.blobMerge) },
      uRange: { value: new THREE.Vector2(...CONFIG.blobRange) },
      uLook: { value: new THREE.Vector3(CONFIG.rim, CONFIG.edge, CONFIG.spec) },
      uRefract: { value: CONFIG.refract },
      uZoom: { value: CONFIG.zoom },
      uMouse: { value: new THREE.Vector2(-1e4, -1e4) },
      uMouseAmt: { value: 0 },
      uMouseR: { value: CONFIG.mouseRadius },
      uDrop: { value: new THREE.Vector3(-1e4, -1e4, 0) },
      uDropMag: { value: CONFIG.dropMagnify },
    }

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
    })
    scene.add(new THREE.Mesh(geometry, material))

    const bufferSize = new THREE.Vector2()
    const render = () => renderer.render(scene, camera)

    /* ── 타이틀을 화면과 같은 위치·크기로 그림판에 다시 그림 ── */
    const drawText = () => {
      const bw = bufferSize.x
      const bh = bufferSize.y
      if (!bw || !bh) return
      if (textCanvas.width !== bw || textCanvas.height !== bh) {
        textCanvas.width = bw
        textCanvas.height = bh
      }
      tctx.clearRect(0, 0, bw, bh)

      const title = titleRef?.current
      const base = baselineRef?.current
      if (title && base) {
        const dpr = uniforms.uDpr.value
        const br = box.getBoundingClientRect()
        const tr = title.getBoundingClientRect()
        const bl = base.getBoundingClientRect()
        const cs = getComputedStyle(title)
        const text = title.textContent

        tctx.save()
        tctx.scale(dpr, dpr)
        tctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
        if ('fontStretch' in tctx) tctx.fontStretch = 'condensed'
        if ('letterSpacing' in tctx && cs.letterSpacing !== 'normal') {
          tctx.letterSpacing = cs.letterSpacing
        }
        tctx.textBaseline = 'alphabetic'
        tctx.fillStyle = '#000'

        // 폭을 화면 타이틀과 정확히 맞춤
        const natural = tctx.measureText(text).width
        const sx = natural > 0 ? tr.width / natural : 1
        tctx.translate(tr.left - br.left, bl.top - br.top)
        tctx.scale(sx, 1)
        tctx.fillText(text, 0, 0)
        tctx.restore()
      }
      texture.needsUpdate = true
    }

    /* ── 크기 조정 ── */
    const resize = () => {
      const w = box.clientWidth
      const h = box.clientHeight
      if (!w || !h) return
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        coarse ? CONFIG.maxDprMobile : CONFIG.maxDpr,
      )
      renderer.setPixelRatio(dpr)
      renderer.setSize(w, h, false)
      renderer.getDrawingBufferSize(bufferSize)
      uniforms.uRes.value.copy(bufferSize)
      uniforms.uDpr.value = dpr
      drawText()
      render()
    }

    /* ── 커서 (예온의 액체는 밀려남) ── */
    const mouse = { x: 0, y: 0, sx: 0, sy: 0, amt: 0, target: 0 }

    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      const r = box.getBoundingClientRect()
      const lx = e.clientX - r.left
      const ly = e.clientY - r.top
      const m = 60
      const near = lx > -m && lx < r.width + m && ly > -m && ly < r.height + m
      mouse.target = near ? 1 : 0
      if (near) {
        if (mouse.amt < 0.01) {
          mouse.sx = lx
          mouse.sy = ly
        }
        mouse.x = lx
        mouse.y = ly
      }
    }
    const onOut = (e) => {
      if (!e.relatedTarget) mouse.target = 0
    }

    /* ── 이비 방울 (예측할 수 없게 + 커서 쪽으로 다가옴) ── */
    const drop = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, k: 4, next: 0, ready: false }

    const stepDrop = (now, dt) => {
      const W = box.clientWidth
      const H = box.clientHeight
      if (!W || !H) return
      const dpr = uniforms.uDpr.value
      const s = Math.min(W, H) / 2
      const r = s * CONFIG.dropSize * (1 + 0.05 * Math.sin(now * 0.0023))
      const pad = r + 10

      if (!drop.ready) {
        drop.x = drop.tx = rand(pad, W - pad)
        drop.y = drop.ty = rand(pad, H - pad)
        drop.ready = true
      }

      // 새 목적지: 언제, 어디로, 얼마나 빨리 갈지 매번 무작위
      if (now > drop.next) {
        drop.tx = rand(pad, W - pad)
        drop.ty = rand(pad, H - pad)
        drop.k = Math.random() < 0.2 ? rand(14, 22) : rand(2.5, 6)
        drop.next = now + rand(1600, 5200)
      }

      let tx = drop.tx
      let ty = drop.ty
      if (mouse.amt > 0.01) {
        tx += (mouse.sx - tx) * CONFIG.dropCuriosity * mouse.amt
        ty += (mouse.sy - ty) * CONFIG.dropCuriosity * mouse.amt
      }

      // 스프링 (살짝 덜 감쇠해서 멈출 때 출렁임)
      const damp = Math.sqrt(drop.k) * 1.6
      drop.vx += ((tx - drop.x) * drop.k - drop.vx * damp) * dt
      drop.vy += ((ty - drop.y) * drop.k - drop.vy * damp) * dt
      drop.x = Math.min(W - pad, Math.max(pad, drop.x + drop.vx * dt))
      drop.y = Math.min(H - pad, Math.max(pad, drop.y + drop.vy * dt))

      uniforms.uDrop.value.set(drop.x * dpr, (H - drop.y) * dpr, r * dpr)
    }

    const stepMouse = (dt) => {
      const dpr = uniforms.uDpr.value
      const H = box.clientHeight
      mouse.amt += (mouse.target - mouse.amt) * Math.min(1, dt * 6)
      mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 10)
      mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 10)
      uniforms.uMouseAmt.value = mouse.amt
      uniforms.uMouse.value.set(mouse.sx * dpr, (H - mouse.sy) * dpr)
    }

    /* ── 매 프레임 (화면에 보일 때만) ── */
    let raf = 0
    let visible = true
    let last = performance.now()

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!visible) return
      uniforms.uTime.value += dt * CONFIG.speed
      stepMouse(dt)
      stepDrop(now, dt)
      render()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(box)
    if (titleRef?.current) ro.observe(titleRef.current)
    resize()

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    io.observe(box)

    // 글꼴 로딩·등장 애니메이션이 끝난 뒤 위치를 다시 맞춤
    const redraw = () => {
      if (disposed) return   // 이미 지워진 장치면 무시
      drawText()
      render()
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw)
    box.addEventListener('animationend', redraw)

    if (reduced) {
      // 모션 줄이기: 정지 화면 한 장
      uniforms.uTime.value = 4.0
      const W = box.clientWidth
      const H = box.clientHeight
      const dpr = uniforms.uDpr.value
      const r = (Math.min(W, H) / 2) * CONFIG.dropSize
      uniforms.uDrop.value.set(W * 0.7 * dpr, H * 0.7 * dpr, r * dpr)
      render()
    } else {
      window.addEventListener('pointermove', onMove, { passive: true })
      document.addEventListener('mouseout', onOut)
      raf = requestAnimationFrame(loop)
    }

    return () => {
      disposed = true        // ← 추가
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      box.removeEventListener('animationend', redraw)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('mouseout', onOut)
      texture.dispose()
      geometry.dispose()
      material.dispose()
      const gl = renderer.getContext()
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      renderer.dispose()
    }
  }, [titleRef, baselineRef])

  return (
    <div
      ref={boxRef}
      className="rf-specimen rf-hero__fade"
      style={{ '--d': '1.7s' }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="rf-specimen__canvas" />

      <span className="rf-specimen__scale" />
      <span className="rf-specimen__c rf-specimen__c--tl" />
      <span className="rf-specimen__c rf-specimen__c--tr" />
      <span className="rf-specimen__c rf-specimen__c--bl" />
      <span className="rf-specimen__c rf-specimen__c--br" />

      <span className="rf-specimen__label">(Containment) RF-01-C</span>
      <span className="rf-specimen__readout">Vol. 34.0 mL · T 23.0°C</span>
    </div>
  )
}