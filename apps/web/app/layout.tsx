import './globals.css';
import MobileNav from './mobile-nav';
export default function Layout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}<MobileNav/></body></html>}
