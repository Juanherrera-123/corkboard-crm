'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/dashboard', label: 'Fichas de cliente' }, // fichas
  { href: '/templates', label: 'Plantillas' },
  { href: '/scripts', label: 'Guiones' },
  { href: '/profile', label: 'Perfil' },
  { href: '/brokers', label: 'Comparador de Brokers' },
  { href: '/settings', label: 'Ajustes' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 min-h-screen p-4">
      <div className="text-lg font-semibold text-slate-800 mb-4">Corkboard CRM</div>
      <nav className="space-y-1">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                active ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
