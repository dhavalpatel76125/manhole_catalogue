import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
export default defineConfig({
  testDir: './tests', timeout: 45000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 1000 }, headless: true, launchOptions: existsSync(chrome) ? { executablePath: chrome } : {}, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
    { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
  ],
})
