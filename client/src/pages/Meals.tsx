import React, { useState, useEffect } from 'react';
import {
  format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, UtensilsCrossed, Trash2, ShoppingCart, CheckCircle, AlertCircle } from 'lucide-react';
import { useMealPlan, useCreateMealPlanEntry, useDeleteMealPlanEntry, useCheckGroceries } from '../hooks/useMealPlan';
import { useRecipes } from '../hooks/useRecipes';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { MealPlanEntry, MealType } from '../types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_TYPE_ORDER: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };

function MealBadge({ entry, onDelete, onCheck }: { entry: MealPlanEntry; onDelete: () => void; onCheck: () => void }) {
  return (
    <div className="bg-surface-raised border border-slate-700/50 rounded-lg px-2 py-1.5 flex items-start gap-1.5 group">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-accent/70 capitalize">{entry.meal_type}</p>
        <p className="text-xs text-slate-200 truncate">{entry.recipe_name ?? entry.custom_name}</p>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {entry.recipe_id && (
          <button onClick={onCheck} title="Check groceries" className="p-0.5 text-slate-500 hover:text-accent rounded">
            <ShoppingCart className="w-3 h-3" />
          </button>
        )}
        <button onClick={onDelete} className="p-0.5 text-slate-500 hover:text-red-400 rounded">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function MealsPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: entries = [], isLoading } = useMealPlan(startStr, endStr);
  const { data: recipes = [] } = useRecipes();
  const { mutate: createEntry } = useCreateMealPlanEntry();
  const { mutate: deleteEntry } = useDeleteMealPlanEntry();
  const { mutate: checkGroceries, isPending: checking } = useCheckGroceries();

  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addMealType, setAddMealType] = useState<MealType>('dinner');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');

  const [checkResult, setCheckResult] = useState<{ added: string[]; alreadyHave: string[] } | null>(null);

  // Reset to the current week when the tab regains focus, but not while adding a meal
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible' && !showAdd) {
        setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
      }
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, [showAdd]);

  const mealsForDay = (day: Date) =>
    entries
      .filter(e => e.date === format(day, 'yyyy-MM-dd'))
      .sort((a, b) => (MEAL_TYPE_ORDER[a.meal_type] ?? 9) - (MEAL_TYPE_ORDER[b.meal_type] ?? 9));

  const openAdd = (date: string) => {
    setAddDate(date);
    setAddMealType('dinner');
    setSelectedRecipeId('');
    setCustomName('');
    setRecipeSearch('');
    setShowAdd(true);
  };

  const handleAdd = () => {
    if (!addDate || (!selectedRecipeId && !customName.trim())) return;
    createEntry({
      date: addDate,
      meal_type: addMealType,
      recipe_id: selectedRecipeId || null,
      custom_name: selectedRecipeId ? '' : customName.trim(),
    }, { onSuccess: () => setShowAdd(false) });
  };

  const handleCheck = (entry: MealPlanEntry) => {
    checkGroceries(entry.id, {
      onSuccess: r => {
        if (r.success && r.data) setCheckResult(r.data);
      },
    });
  };

  const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase()));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 shrink-0">
        <UtensilsCrossed className="w-5 h-5 text-accent" />
        <h1 className="text-base font-semibold text-slate-100 mr-auto">Meal Plan</h1>
        <button onClick={() => setWeekStart(w => addDays(w, -7))} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-surface-raised rounded-lg">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-400 min-w-[160px] text-center">
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <button onClick={() => setWeekStart(w => addDays(w, 7))} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-surface-raised rounded-lg">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))} className="px-2.5 py-1 text-xs text-accent border border-accent/30 hover:bg-accent/10 rounded-lg">
          Today
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {days.map(day => {
              const dayMeals = mealsForDay(day);
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-xl border p-2 flex flex-col gap-1.5 min-h-[180px] ${today ? 'border-accent/50 bg-accent/5' : 'border-slate-700/50 bg-surface'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-semibold ${today ? 'text-accent' : 'text-slate-400'}`}>{format(day, 'EEE')}</p>
                      <p className="text-sm font-bold text-slate-200">{format(day, 'd')}</p>
                    </div>
                    <button onClick={() => openAdd(format(day, 'yyyy-MM-dd'))} className="p-1 rounded hover:bg-surface-raised text-slate-500 hover:text-accent">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1 flex-1">
                    {dayMeals.map(entry => (
                      <MealBadge
                        key={entry.id}
                        entry={entry}
                        onDelete={() => deleteEntry(entry.id)}
                        onCheck={() => handleCheck(entry)}
                      />
                    ))}
                    {dayMeals.length === 0 && (
                      <p className="text-[10px] text-slate-700 italic">Nothing planned</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add meal modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={`Add Meal — ${addDate}`} size="md">
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Meal type</label>
            <div className="flex gap-2">
              {MEAL_TYPES.map(t => (
                <button key={t} onClick={() => setAddMealType(t)}
                  className={`px-3 py-1.5 text-xs rounded-lg capitalize border transition-colors ${addMealType === t ? 'bg-accent text-white border-accent' : 'border-slate-600 text-slate-400 hover:text-slate-200'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {recipes.length > 0 && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Pick a recipe</label>
              <input
                value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)}
                placeholder="Search recipes…"
                className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent mb-2"
              />
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-slate-700/50 p-1">
                <button
                  onClick={() => setSelectedRecipeId('')}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${!selectedRecipeId ? 'bg-accent/10 text-accent' : 'text-slate-400 hover:bg-surface-raised hover:text-slate-200'}`}
                >
                  — None (custom name) —
                </button>
                {filteredRecipes.map(r => (
                  <button key={r.id} onClick={() => setSelectedRecipeId(r.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${selectedRecipeId === r.id ? 'bg-accent/10 text-accent' : 'text-slate-200 hover:bg-surface-raised'}`}>
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!selectedRecipeId && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Custom name</label>
              <input
                value={customName} onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Takeout, Leftovers…"
                className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent"
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={!addDate || (!selectedRecipeId && !customName.trim())}
              className="px-4 py-1.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      </Modal>

      {/* Grocery check result modal */}
      <Modal isOpen={!!checkResult} onClose={() => setCheckResult(null)} title="Grocery Check" size="sm">
        {checkResult && (
          <div className="p-4 space-y-3">
            {checkResult.added.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-3.5 h-3.5" /> Added to shopping list
                </p>
                <ul className="space-y-1">
                  {checkResult.added.map(item => (
                    <li key={item} className="text-sm text-slate-200 flex items-center gap-1.5">
                      <ShoppingCart className="w-3 h-3 text-accent shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {checkResult.alreadyHave.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-3.5 h-3.5" /> Already have
                </p>
                <ul className="space-y-1">
                  {checkResult.alreadyHave.map(item => (
                    <li key={item} className="text-sm text-slate-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {checkResult.added.length === 0 && checkResult.alreadyHave.length === 0 && (
              <p className="text-sm text-slate-500">No ingredients to check.</p>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={() => setCheckResult(null)} className="px-4 py-1.5 text-sm bg-surface-raised hover:bg-slate-700 text-slate-200 rounded-lg">Done</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
