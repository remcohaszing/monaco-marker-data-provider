import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  optimizeDeps: {
    include: ['monaco-editor-core']
  },
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      headless: true,
      instances: [{ browser: 'chromium' }]
    },
    coverage: {
      enabled: true
    }
  }
})
