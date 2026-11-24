'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BuyerPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/buyer/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand text-xs font-semibold text-charcoal-muted">
      Opening Buyer Dashboard...
    </div>
  );
}
