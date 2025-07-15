import React, { useEffect, useState } from 'react'

export default function useDarkMode() {
    const [enabled, setEnabled] = useState(() => {
      const stored = localStorage.getItem('darkMode');
      return stored === 'true' || (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    useEffect(() => {
      const root = document.documentElement;
      if (enabled) {
        root.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        root.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    }, [enabled])
  return [enabled, setEnabled]
}
