import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventory';
import type { GroceryItem } from '../types';

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getInventory(),
    select: d => d.data ?? [],
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useGroceryList() {
  return useQuery({
    queryKey: ['grocery'],
    queryFn: () => inventoryApi.getGrocery(),
    select: d => d.data ?? [],
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useToggleGrocery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) =>
      inventoryApi.updateGroceryItem(id, { checked }),
    onMutate: async ({ id, checked }) => {
      await qc.cancelQueries({ queryKey: ['grocery'] });
      const prev = qc.getQueryData<GroceryItem[]>(['grocery']);
      qc.setQueryData<GroceryItem[]>(['grocery'], old =>
        old?.map(i => (i.id === id ? { ...i, checked } : i))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['grocery'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['grocery'] }),
  });
}

export function useAddGroceryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.addGroceryItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery'] }),
  });
}

export function useClearChecked() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.clearCheckedGrocery,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery'] }),
  });
}

export function useMarkEmpty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.markEmpty(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['grocery'] });
    },
  });
}
