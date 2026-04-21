import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shoppingApi } from '../api/shopping';
import type { ShoppingItem } from '../types';

export function useShoppingList() {
  return useQuery({
    queryKey: ['shopping'],
    queryFn: async () => {
      const r = await shoppingApi.getAll();
      return r.data ?? [];
    },
  });
}

export function useCreateShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shoppingApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  });
}

export function useUpdateShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShoppingItem> }) =>
      shoppingApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  });
}

export function useDeleteShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shoppingApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  });
}

export function useClearCheckedShopping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shoppingApi.clearChecked,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  });
}
