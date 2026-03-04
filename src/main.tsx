import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Restore path after GitHub Pages 404 redirect.
// The 404.html encodes the original path as ?p=<encoded-path>.
(function restoreGitHubPagesPath() {
  const params = new URLSearchParams(window.location.search);
  const path = params.get('p');
  if (path) {
    params.delete('p');
    const qs = params.get('q') ?? '';
    params.delete('q');
    const search = qs ? `?${qs}` : '';
    const hash = window.location.hash;
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const newUrl = base + '/' + path + search + hash;
    window.history.replaceState(null, '', newUrl);
  }
})();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
