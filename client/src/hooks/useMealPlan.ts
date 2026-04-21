import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mealplanApi } from '../api/mealplan';

export function useMealPlan(start?: string, end?: string) {
  return useQuery({
    queryKey: ['mealplan', start, end],
    queryFn: async () => {
      const r = await mealplanApi.getAll(start, end);
      return r.data ?? [];
    },
  });
}

export function useCreateMealPlanEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mealplanApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mealplan'] }),
  });
}

export function useDeleteMealPlanEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mealplanApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mealplan'] }),
  });
}

export function useCheckGroceries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mealplanApi.checkGroceries,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  });
}
