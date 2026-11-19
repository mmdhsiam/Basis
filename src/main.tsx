import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Diagnostic only: do not log credentials or user data.
    console.error('[AppRenderError]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
            <h1 className="text-xl font-bold">অ্যাপ চালু করতে সমস্যা হয়েছে</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              অ্যাপের একটি স্ক্রিনে ত্রুটি হয়েছে। অ্যাপটি আবার চালু করুন। সমস্যা থাকলে ত্রুটির লগ দিয়ে সাপোর্টে যোগাযোগ করুন।
            </p>
            <button
              type="button"
              className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white"
              onClick={() => window.location.reload()}
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root was not found in index.html');
}

createRoot(rootElement).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
