import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  ShoppingCart,
  CheckSquare,
  UtensilsCrossed,
  BookOpen,
  ClipboardList,
  Baby,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

const ITEMS = [
  { to: '/',           icon: LayoutDashboard, label: 'Home' },
  { to: '/calendar',   icon: Calendar,        label: 'Calendar' },
  { to: '/meals',      icon: UtensilsCrossed, label: 'Meals' },
  { to: '/grocery',    icon: ShoppingCart,    label: 'Grocery' },
  { to: '/recipes',    icon: BookOpen,        label: 'Recipes' },
  { to: '/chores',     icon: CheckSquare,     label: 'Chores' },
  { to: '/tasks',      icon: ClipboardList,   label: 'Tasks' },
  { to: '/babysitter', icon: Baby,            label: 'Babysitter' },
  { to: '/settings',   icon: Settings,        label: 'Settings' },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-slate-700/50 z-50 pb-safe">
      <div className="flex overflow-x-auto scrollbar-none">
        {ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-colors shrink-0',
                isActive ? 'text-accent' : 'text-slate-500'
              )
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
