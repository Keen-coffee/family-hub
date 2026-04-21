import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { mealieApi } from '../api/mealie';
import type { MealieRecipe, MealieMealPlan, MealieShoppingItem } from '../types';

export function useRecipes(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['recipes', params],
    queryFn: () => mealieApi.getRecipes(params),
    select: d => {
      const raw = d.data as unknown;
      const items = Array.isArray(raw)
        ? raw
        : (raw as { items?: MealieRecipe[] } | null)?.items ?? [];
      return { items } as { items: MealieRecipe[] };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecipe(slug: string | null) {
  return useQuery({
    queryKey: ['recipe', slug],
    queryFn: () => mealieApi.getRecipe(slug!),
    enabled: slug != null,
    select: d => d.data as MealieRecipe,
  });
}

export function useMealPlan(weeksAhead = 1) {
  const from = format(new Date(), 'yyyy-MM-dd');
  const to = format(addDays(new Date(), weeksAhead * 7), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['meal-plan', from, to],
    queryFn: () => mealieApi.getMealPlan(from, to),
    select: d => {
      const raw = d.data as unknown;
      return (Array.isArray(raw)
        ? raw
        : (raw as { items?: MealieMealPlan[] } | null)?.items ?? []) as MealieMealPlan[];
    },
    refetchInterval: 15 * 60 * 1000,
  });
}

export function useCreateMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mealieApi.createMealPlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plan'] }),
  });
}

export function useDeleteMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mealieApi.deleteMealPlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plan'] }),
  });
}

export function useShoppingList() {
  return useQuery({
    queryKey: ['shopping'],
    queryFn: () => mealieApi.getShopping(),
    select: d => {
      const raw = d.data as unknown;
      return (Array.isArray(raw)
        ? raw
        : (raw as { items?: MealieShoppingItem[] } | null)?.items ?? []) as MealieShoppingItem[];
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useUpdateShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, item }: { id: string; item: Partial<MealieShoppingItem> }) =>
      mealieApi.updateShoppingItem(id, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  });
}
