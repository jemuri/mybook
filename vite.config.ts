import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'mybook'
const isUserSiteRepo = repoName.endsWith('.github.io')

const base = process.env.NODE_ENV === 'production'
  ? (isUserSiteRepo ? '/' : `/${repoName}/`)
  : '/'

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 3000,
    open: true
  }
})
