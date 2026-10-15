import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Runs the files in /api inside the local dev server, the same way Vercel runs them when hosted.
// Secrets from .env (GEMINI_API_KEY) are given to these server functions only, never to the browser.
function localApi(env) {
  return {
    name: 'local-api',
    configureServer(server) {
      Object.assign(process.env, env);
      server.middlewares.use(async (req, res, next) => {
        const m = req.url.match(/^\/api\/([\w-]+)$/);
        if (!m) return next();
        const file = path.resolve('api', `${m[1]}.js`);
        if (!fs.existsSync(file)) return next();
        let raw = '';
        for await (const chunk of req) raw += chunk;
        try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
        try {
          const mod = await server.ssrLoadModule(file);
          await mod.default(req, res);
        } catch (e) {
          res.status(500).json({ error: String(e.message || e) });
        }
      });
    },
  };
}

// Chotu's voice clips live in /audio (made by generate_voice.py). Copy them into the build so hosting works too.
function copyAudio() {
  return {
    name: 'copy-audio',
    closeBundle() {
      if (fs.existsSync('audio')) fs.cpSync('audio', path.join('dist', 'audio'), { recursive: true });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // reads .env; nothing here is exposed to the page
  return {
    plugins: [react(), localApi(env), copyAudio()],
    server: { port: 5173, open: false },
  };
});
