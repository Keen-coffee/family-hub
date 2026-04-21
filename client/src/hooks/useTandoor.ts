import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { tandoorApi } from '../api/tandoor';

export function useRecipes(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['recipes', params],
    queryFn: () => tandoorApi.getRecipes(params),
    select: d => d.data,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecipe(id: number | null) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => tandoorApi.getRecipe(id!),
    enabled: id != null,
    select: d => d.data,
  });
}

export function useMealPlan(weeksAhead = 1) {
  const from = format(new Date(), 'yyyy-MM-dd');
  const to = format(addDays(new Date(), weeksAhead * 7), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['meal-plan', from, to],
    queryFn: () => tandoorApi.getMealPlan(from, to),
    select: d => {
      const raw = d.data as unknown;
      return (Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | null)?.results ?? []) as unknown[];
    },
    refetchInterval: 15 * 60 * 1000,
  });
}

export function useCreateMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tandoorApi.createMealPlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plan'] }),
  });
}

export function useDeleteMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tandoorApi.deleteMealPlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plan'] }),
  });
}

export function useShoppingList() {
  return useQuery({
    queryKey: ['shopping'],
    queryFn: () => tandoorApi.getShopping(),
    select: d => {
      const raw = d.data as unknown;
      return (Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | null)?.results ?? []) as unknown[];
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useUpdateShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, item }: { id: number; item: Parameters<typeof tandoorApi.updateShoppingItem>[1] }) =>
      tandoorApi.updateShoppingItem(id, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  });
}
