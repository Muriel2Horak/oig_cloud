import { bootstrap } from './core/bootstrap';
import { oigLog } from './core/logger';

oigLog.info('V2 starting', { version: import.meta.env.VITE_VERSION });

async function main() {
  try {
    const app = await bootstrap();
    const container = document.getElementById('app');
    if (container) {
      container.innerHTML = '';
      container.appendChild(app);
    }
    oigLog.info('V2 mounted successfully');
  } catch (error) {
    oigLog.error('V2 bootstrap failed', error as Error);
    const container = document.getElementById('app');
    if (container) {
      container.innerHTML = `
      <div style="padding: 20px; font-family: system-ui;">
        <h2>Chyba načítání</h2>
        <p>Nepodařilo se načíst dashboard. Zkuste obnovit stránku.</p>
        <details>
          <summary>Detaily</summary>
          <pre>${(error as Error).message}</pre>
        </details>
      </div>`;
    }
  }
}

main();
