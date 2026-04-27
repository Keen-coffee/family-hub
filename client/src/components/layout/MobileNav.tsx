import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, ShoppingCart, CheckSquare, UtensilsCrossed } from 'lucide-react';
import clsx from 'clsx';

const ITEMS = [
  { to: '/',         icon: LayoutDashboard,  label: 'Home' },
  { to: '/calendar', icon: Calendar,         label: 'Calendar' },
  { to: '/grocery',  icon: ShoppingCart,     label: 'Grocery' },
  { to: '/chores',   icon: CheckSquare,      label: 'Chores' },
  { to: '/recipes',  icon: UtensilsCrossed,  label: 'Recipes' },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-slate-700/50 flex z-50 pb-safe">
      {ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            clsx(
              'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-accent' : 'text-slate-500'
            )
          }
        >
          <Icon className="w-5 h-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
