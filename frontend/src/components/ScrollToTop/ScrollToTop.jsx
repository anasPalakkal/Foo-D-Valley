import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    // Leave anchor links and back/forward navigation to the browser
    if (hash || navType === 'POP') return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash, navType])

  return null
}