;(() => {
  try {
    const storedTheme = localStorage.getItem('tinytime:theme')
    const isDark =
      storedTheme === 'dark' ||
      ((storedTheme === 'system' || storedTheme === null) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  } catch {
    // Ignore theme bootstrap errors and use CSS defaults.
  }
})()
