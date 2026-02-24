import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initGlassEngine } from './effects/glassEngine'

// Initialize Apple Vision Pro Spring Physics Engine
initGlassEngine();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
