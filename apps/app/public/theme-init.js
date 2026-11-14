;(() => {
  try {
    const storedTheme = localStorage.getItem('tinytime:theme')
    const isDark =
      storedTheme === 'dark' ||
      ((storedTheme === 'system' || storedTheme === null) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'

    // These colours must match FRAME_THEME_COLORS in src/hooks/useTheme.ts:
    // this file is served statically, so it cannot import the constant.
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', isDark ? '#f5f3f0' : '#1e1b4b')
  } catch {
    // Ignore theme bootstrap errors and use CSS defaults.
  }
})()
