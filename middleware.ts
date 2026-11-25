import { type NextRequest } from 'next/server';
import { updateSessionAndEnforceRoutes } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSessionAndEnforceRoutes(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (all Next.js internals, static files, image optimization, webpack-hmr)
     * - favicon.ico
     * - public image assets
     */
    '/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
