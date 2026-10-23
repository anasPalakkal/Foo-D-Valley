import { useEffect } from 'react'

const BASE = 'Foo D Valley'

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE}` : BASE
  }, [title])
}