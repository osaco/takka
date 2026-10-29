import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './runtime/App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('لا حاوية للجذر #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
