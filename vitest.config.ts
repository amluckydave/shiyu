import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['docs/.vuepress/plugins/bilingual-pack/client/utils/**/*.test.ts']
  }
})
