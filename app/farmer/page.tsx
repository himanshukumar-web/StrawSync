'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FarmerPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/farmer/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand text-xs font-semibold text-charcoal-muted">
      Opening Farmer Dashboard...
    </div>
  );
}
