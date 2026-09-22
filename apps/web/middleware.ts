import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

// The client/API session is the source of truth. The cookie only prevents
// obvious unauthenticated page access; do not create redirect loops for
// profile/admin when a browser has a valid localStorage session.
const protectedPrefixes=['/dashboard','/wallet','/investments','/bonus','/referrals','/notifications','/profile','/admin'];

export function middleware(request:NextRequest){
  const path=request.nextUrl.pathname;
  if(!protectedPrefixes.some(prefix=>path===prefix||path.startsWith(prefix+'/'))) return NextResponse.next();
  const token=request.cookies.get('nova_access_token')?.value;
  if(!token){
    const url=request.nextUrl.clone();
    url.pathname='/login';
    url.searchParams.set('next',path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config={matcher:['/dashboard/:path*','/wallet/:path*','/investments/:path*','/bonus/:path*','/referrals/:path*','/profile/:path*','/notifications/:path*','/admin/:path*']};
