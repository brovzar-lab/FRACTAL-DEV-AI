import { useEffect } from 'react'
import AppShell from './components/layout/AppShell'
import useScreenplayStore from './store/screenplayStore'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts'

export default function App() {
  const theme = useScreenplayStore(s => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Mount global keyboard shortcuts
  useKeyboardShortcuts()

  return <AppShell />
}
