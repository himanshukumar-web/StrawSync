'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand text-xs font-semibold text-charcoal-muted">
      Opening Login Portal...
    </div>
  );
}
