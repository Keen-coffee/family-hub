import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { format, addDays, parseISO, isToday, isTomorrow } from 'date-fns';
import { useMealPlan } from '../../hooks/useMealPlan';
import { useWidgetSetting } from '../dashboard/WidgetConfigContext';
import LoadingSpinner from '../common/LoadingSpinner';
import type { MealPlanEntry } from '../../types';

const MEAL_TYPE_ORDER: Record<string, number> = {
  breakfast: 0, lunch: 1, dinner: 2, snack: 3,
};

function dayLabel(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE');
}

export default function MealsWidget() {
  const daysAhead = useWidgetSetting<number>('daysAhead', 3);
  const today = format(new Date(), 'yyyy-MM-dd');
  const endDate = format(addDays(new Date(), daysAhead - 1), 'yyyy-MM-dd');
  const { data: mealPlan, isLoading } = useMealPlan(today, endDate);

  const days = Array.from({ length: daysAhead }, (_, i) => format(addDays(new Date(), i), 'yyyy-MM-dd'));

  const byDay = days.reduce<Record<string, MealPlanEntry[]>>((acc, day) => {
    acc[day] = (mealPlan ?? [])
      .filter(m => m.date === day)
      .sort((a, b) => (MEAL_TYPE_ORDER[a.meal_type] ?? 9) - (MEAL_TYPE_ORDER[b.meal_type] ?? 9));
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center gap-2 shrink-0">
        <UtensilsCrossed className="w-4 h-4 text-accent shrink-0" />
        <span className="text-xs font-semibold text-slate-300">Meals</span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
        ) : (
          days.map(day => (
            <div key={day} className="px-2 py-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {dayLabel(day)}
              </p>
              {byDay[day].length === 0 ? (
                <p className="text-xs text-slate-600 italic pl-1">No meals planned</p>
              ) : (
                byDay[day].map(meal => (
                  <div key={meal.id} className="flex items-center gap-2 py-0.5 px-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 truncate">{meal.recipe_name ?? meal.custom_name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{meal.meal_type}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
