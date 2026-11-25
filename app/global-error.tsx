'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-[#F7F8F3] text-[#202923] p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E3E9E2] text-center space-y-4">
          <h2 className="text-xl font-bold">StrawSync encountered an unexpected error</h2>
          <p className="text-xs text-[#748078]">
            {error?.message || 'Please reload or reset the view.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2.5 bg-[#245C43] text-white rounded-xl text-xs font-bold"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
