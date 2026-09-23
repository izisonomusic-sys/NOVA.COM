import type { Metadata } from 'next';
import './globals.css';
import MobileNav from './mobile-nav';

export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
};

export default function Layout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}<MobileNav/></body></html>}
