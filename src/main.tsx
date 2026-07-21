import './index.css';
import { initApp } from './js/app';

// Initialize the vanilla FHC Admin Dashboard application
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });
}

