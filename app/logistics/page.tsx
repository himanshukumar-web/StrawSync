'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogisticsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/logistics/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand text-xs font-semibold text-charcoal-muted">
      Opening Logistics Dashboard...
    </div>
  );
}
