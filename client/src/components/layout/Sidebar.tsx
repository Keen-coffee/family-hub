import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  UtensilsCrossed,
  ShoppingCart,
  BookOpen,
  CheckSquare,
  ClipboardList,
  Baby,
  Settings,
  Home,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar,        label: 'Calendar' },
  { to: '/meals',    icon: UtensilsCrossed, label: 'Meals' },
  { to: '/grocery',  icon: ShoppingCart,    label: 'Grocery' },
  { to: '/recipes',  icon: BookOpen,        label: 'Recipes' },
  { to: '/chores',   icon: CheckSquare,     label: 'Chores' },
  { to: '/tasks',      icon: ClipboardList,   label: 'Tasks' },
  { to: '/babysitter', icon: Baby,            label: 'Babysitter' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside
      className={clsx(
        'flex flex-col h-full bg-surface border-r border-slate-700/50 shrink-0 transition-all duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo + toggle */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-slate-700/50 min-h-[57px]">
        <Home className="w-6 h-6 text-accent shrink-0" />
        {!collapsed && (
          <span className="flex-1 text-sm font-semibold text-slate-100 truncate">Family Hub</span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto p-0.5 rounded text-slate-500 hover:text-slate-300 hover:bg-surface-raised transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 py-2.5 mx-1 my-0.5 rounded-lg transition-colors text-sm font-medium',
                collapsed ? 'justify-center px-0' : 'px-3',
                isActive
                  ? 'bg-accent/20 text-accent'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-surface-raised'
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <div className="border-t border-slate-700/50 py-2">
        <NavLink
          to="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 py-2.5 mx-1 rounded-lg transition-colors text-sm font-medium',
              collapsed ? 'justify-center px-0' : 'px-3',
              isActive
                ? 'bg-accent/20 text-accent'
                : 'text-slate-400 hover:text-slate-100 hover:bg-surface-raised'
            )
          }
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
