import React, { useState } from 'react';
import { Edit3, RotateCcw, Plus, LayoutDashboard } from 'lucide-react';
import DashboardGrid from '../components/dashboard/DashboardGrid';
import WidgetSelector from '../components/dashboard/WidgetSelector';
import Modal from '../components/common/Modal';
import { useDashboardStore } from '../stores/dashboardStore';

export default function Dashboard() {
  const { isEditing, setIsEditing, resetLayout } = useDashboardStore();
  const [showSelector, setShowSelector] = useState(false);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50 shrink-0 bg-surface/50 backdrop-blur-sm">
        <LayoutDashboard className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-300 mr-auto">Dashboard</span>

        {isEditing && (
          <>
            <button
              onClick={() => setShowSelector(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Widget
            </button>
            <button
              onClick={resetLayout}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-surface-raised rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </>
        )}

        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-colors ${
            isEditing
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          {isEditing ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0">
        <DashboardGrid />
      </div>

      {/* Widget selector modal */}
      <Modal isOpen={showSelector} onClose={() => setShowSelector(false)} title="Add Widget" size="sm">
        <WidgetSelector onClose={() => setShowSelector(false)} />
      </Modal>
    </div>
  );
}
