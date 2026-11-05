const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './test',
  fullyParallel: true,
  use: { browserName: 'chromium', channel: 'chromium', headless: true },
})
