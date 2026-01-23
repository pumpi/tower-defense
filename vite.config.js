import { defineConfig } from 'vite'
import packageJson from './package.json'
import fs from 'fs'
import path from 'path'

// Dev-only plugin for game logging
function gameLoggerPlugin() {
  const logsDir = path.resolve(__dirname, 'var/log');

  return {
    name: 'game-logger',
    configureServer(server) {
      // Ensure logs directory exists
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      server.middlewares.use('/api/log', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const { sessionId, event } = JSON.parse(body);
              const logFile = path.join(logsDir, `game_${sessionId}.jsonl`);

              // Append event as JSON line
              fs.appendFileSync(logFile, JSON.stringify(event) + '\n');

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
        } else {
          res.writeHead(405);
          res.end();
        }
      });
    }
  };
}

export default defineConfig({
  root: 'src',
  base: '/tower-defense/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
  },
  plugins: [gameLoggerPlugin()],
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})