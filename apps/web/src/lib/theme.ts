const STORAGE_KEY = 'theme'

export type Theme = 'light' | 'dark' | 'system'

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getStoredTheme(): Theme {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function applyTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark())
  document.documentElement.classList.toggle('dark', isDark)
}
