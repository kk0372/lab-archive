import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 주소에 ?lab 이 붙어 있으면 새 사이트(RainFrog_01), 아니면 기존 사이트
const root = createRoot(document.getElementById('root'))
const isLab = new URLSearchParams(window.location.search).has('lab')

async function boot() {
  if (isLab) {
    // 새 사이트: Tailwind(index.css)를 불러오지 않음
    const { default: LabPreview } = await import('./lab/LabPreview.jsx')
    root.render(
      <StrictMode>
        <LabPreview />
      </StrictMode>,
    )
  } else {
    // 기존 사이트: 예전과 똑같이 동작
    await import('./index.css')
    const { default: App } = await import('./App.jsx')
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  }
}

boot()