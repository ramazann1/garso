import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Poppins pakete gömülü geliyor; kasa internetsizken de yazı tipi doğru görünsün.
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
