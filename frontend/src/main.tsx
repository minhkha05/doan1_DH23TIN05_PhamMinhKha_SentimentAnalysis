import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initGlassEngine } from './effects/glassEngine'

const nav = navigator as Navigator & {
  connection?: { saveData?: boolean }
}

const isLowPowerDevice =
  (navigator.hardwareConcurrency ?? 8) <= 4 ||
  !!nav.connection?.saveData ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (isLowPowerDevice) {
  document.documentElement.classList.add('performance-lite')
}

const scheduleEngineInit = () => {
  if (isLowPowerDevice) return
  window.setTimeout(() => {
    initGlassEngine()
  }, 140)
}

// Prevent heavy entrance animations from stacking during first paint/reload.
document.documentElement.classList.add('app-first-paint');
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('app-first-paint');
    scheduleEngineInit()
  });
});

createRoot(document.getElementById('root')!).render(
  <App />,
)
