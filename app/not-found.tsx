import Link from 'next/link';
import { Sprout, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-earth-border shadow-card text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-sage text-forest flex items-center justify-center mx-auto">
          <Sprout className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-charcoal">Page Not Found</h1>
        <p className="text-xs text-charcoal-muted leading-relaxed">
          The StrawSync route you requested could not be found. Return to the main marketplace or your dashboard.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2.5 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <Link
            href="/buyer/marketplace"
            className="px-4 py-2.5 bg-sand hover:bg-sage border border-earth-border text-charcoal rounded-xl text-xs font-bold transition"
          >
            Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
