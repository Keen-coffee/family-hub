import React from 'react';
import {
  Clock, Cloud, Calendar, ShoppingCart, CheckSquare, UtensilsCrossed, ClipboardList, Plus,
} from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { WidgetType } from '../../types';

const WIDGET_OPTIONS: { type: WidgetType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'clock',    label: 'Clock',    icon: Clock },
  { type: 'weather',  label: 'Weather',  icon: Cloud },
  { type: 'calendar', label: 'Calendar', icon: Calendar },
  { type: 'meals',    label: 'Meals',    icon: UtensilsCrossed },
  { type: 'tasks',    label: 'Tasks',    icon: ClipboardList },
  { type: 'grocery',  label: 'Grocery',  icon: ShoppingCart },
  { type: 'chores',   label: 'Chores',   icon: CheckSquare },
];

interface Props {
  onClose: () => void;
}

export default function WidgetSelector({ onClose }: Props) {
  const addWidget = useDashboardStore(s => s.addWidget);

  return (
    <div className="p-4 grid grid-cols-2 gap-3">
      {WIDGET_OPTIONS.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          onClick={() => { addWidget(type); onClose(); }}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-raised hover:bg-surface-overlay border border-slate-700 hover:border-accent/50 transition-all text-sm font-medium text-slate-300 hover:text-slate-100"
        >
          <Icon className="w-6 h-6 text-accent" />
          {label}
        </button>
      ))}
    </div>
  );
}
