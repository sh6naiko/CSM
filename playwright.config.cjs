const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/frontend',
  timeout: 30000,
  fullyParallel: true,
  use: {
    baseURL: 'http://csm.test',
    viewport: { width: 1440, height: 1000 },
    headless: true,
    launchOptions: process.env.CSM_BROWSER_PATH
      ? { executablePath: process.env.CSM_BROWSER_PATH } : {},
  },
});
