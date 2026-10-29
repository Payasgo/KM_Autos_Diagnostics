/**
 * Application entry point.
 *
 * Deliberately thin: mount the app inside an error boundary and get out of the way.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import './ui/tokens.css';

import { BrandBackdrop } from './ui/components/BrandBackdrop.jsx';
import EcuLab from './ui/EcuLab.jsx';
import { ErrorBoundary } from './ui/ErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrandBackdrop />
    <ErrorBoundary>
      <EcuLab />
    </ErrorBoundary>
  </React.StrictMode>,
);
