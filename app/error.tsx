'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('StrawSync route error:', error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-earth-border shadow-card text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-charcoal">Something went wrong</h2>
        <p className="text-xs text-charcoal-muted">
          A temporary rendering error occurred. Try reloading this view or return to the homepage.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2.5 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2.5 bg-sand border border-earth-border text-charcoal rounded-xl text-xs font-bold transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
