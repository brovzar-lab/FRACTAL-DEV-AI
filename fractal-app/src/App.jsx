import { useEffect } from 'react'
import AppShell from './components/layout/AppShell'
import useScreenplayStore from './store/screenplayStore'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts'
import { Agentation } from 'agentation'

export default function App() {
  const theme = useScreenplayStore(s => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Mount global keyboard shortcuts
  useKeyboardShortcuts()

  return (
    <>
      <AppShell />
      {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}
    </>
  )
}
