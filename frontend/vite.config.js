import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    },
    proxy: {
      // ── API blueprints ──────────────────────────────────────────────────
      '/api': { target: BACKEND, changeOrigin: true, secure: false },

      // ── AI / Feature endpoints ──────────────────────────────────────────
      '/predict':              { target: BACKEND, changeOrigin: true },
      '/translate-report':     { target: BACKEND, changeOrigin: true },
      '/ask-leaf-followup':    { target: BACKEND, changeOrigin: true },
      '/ask-agro-assistant':   { target: BACKEND, changeOrigin: true },
      '/voice-intelligence':   { target: BACKEND, changeOrigin: true },
      '/explain-results':      { target: BACKEND, changeOrigin: true },

      // ── Weather ─────────────────────────────────────────────────────────
      '/weather':              { target: BACKEND, changeOrigin: true },
      '/weather-history':      { target: BACKEND, changeOrigin: true },
      '/weather-intelligence': { target: BACKEND, changeOrigin: true },

      // ── Market / Planner ────────────────────────────────────────────────
      '/prices':               { target: BACKEND, changeOrigin: true },
      '/vegetable-info':       { target: BACKEND, changeOrigin: true },
      '/planner':              { target: BACKEND, changeOrigin: true },

      // ── News ────────────────────────────────────────────────────────────
      '/agri-news':            { target: BACKEND, changeOrigin: true },

      // ── Uploads (Cloudinary via Flask) ───────────────────────────────────
      '/upload-item-image':    { target: BACKEND, changeOrigin: true },
      '/upload-profile-image': { target: BACKEND, changeOrigin: true },

      // ── Legacy item CRUD ─────────────────────────────────────────────────
      '/add-item':             { target: BACKEND, changeOrigin: true },
      '/get-items':            { target: BACKEND, changeOrigin: true },
    },
  },
})
