'use client';
import Link from 'next/link';import {usePathname} from 'next/navigation';
const items=[{href:'/dashboard',label:'Accueil',icon:'⌂'},{href:'/projects',label:'Projets',icon:'▦'},{href:'/investments',label:'Investir',icon:'◫'},{href:'/bonus',label:'Bonus',icon:'✦'},{href:'/referrals',label:'Parrain',icon:'♧'},{href:'/profile',label:'Profil',icon:'●'}];
export default function MobileNav(){const pathname=usePathname();return <nav className="mobile-bottom-nav" aria-label="Navigation mobile">{items.map(item=>{const active=pathname===item.href||pathname.startsWith(item.href+'/');return <Link key={item.href} href={item.href} className={active?'mobile-nav-item active':'mobile-nav-item'}><span className="mobile-nav-icon">{item.icon}</span><span>{item.label}</span></Link>})}</nav>}
