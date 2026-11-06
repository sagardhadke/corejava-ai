import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Vitest configuration
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    // Exclude the legacy node:test files
    exclude: ['src/tests/*.test.mjs', 'node_modules', 'e2e'],
    css: false,
    clearMocks: true,
  },
})
