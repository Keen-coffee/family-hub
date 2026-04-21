import React from 'react';
import { ShoppingCart, CheckSquare, Square } from 'lucide-react';
import { useShoppingList, useUpdateShoppingItem } from '../../hooks/useShopping';
import LoadingSpinner from '../common/LoadingSpinner';
import type { ShoppingItem } from '../../types';

export default function GroceryWidget() {
  const { data: items, isLoading } = useShoppingList();
  const { mutate: updateItem } = useUpdateShoppingItem();

  const unchecked = (items ?? []).filter(i => !i.checked).slice(0, 12);

  const toggle = (item: ShoppingItem) => {
    updateItem({ id: item.id, data: { checked: !item.checked } });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center gap-2 shrink-0">
        <ShoppingCart className="w-4 h-4 text-accent shrink-0" />
        <span className="text-xs font-semibold text-slate-300">Grocery</span>
        {unchecked.length > 0 && (
          <span className="ml-auto text-[10px] bg-accent/20 text-accent rounded-full px-1.5 py-0.5">
            {unchecked.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
        ) : unchecked.length === 0 ? (
          <p className="p-3 text-xs text-slate-500">Nothing on the list</p>
        ) : (
          unchecked.map(item => (
            <button
              key={item.id}
              onClick={() => toggle(item)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-raised transition-colors text-left"
            >
              <div className="shrink-0 text-slate-500">
                {item.checked
                  ? <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  : <Square className="w-3.5 h-3.5" />
                }
              </div>
              <span className="flex-1 text-xs text-slate-200 truncate">{item.name}</span>
              {(item.quantity > 1 || item.unit) && (
                <span className="text-[10px] text-slate-500 shrink-0">
                  {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
