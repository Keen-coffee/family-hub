import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shoppingApi } from '../api/shopping';
import type { ShoppingItem } from '../types';

const KEY = ['shopping'] as const;

export function useShoppingList() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const r = await shoppingApi.getAll();
      return r.data ?? [];
    },
    // Keep stale data showing while refetching — critical for offline UX
    staleTime: 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000, // keep in memory/cache for 24 h
  });
}

export function useCreateShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shoppingApi.create,
    // Optimistic: add a placeholder immediately so it appears without a network round-trip
    onMutate: async (newItem) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<ShoppingItem[]>(KEY);
      const placeholder: ShoppingItem = {
        id: `optimistic-${Date.now()}`,
        name: newItem.name,
        quantity: newItem.quantity ?? 1,
        unit: newItem.unit ?? '',
        checked: false,
        source: (newItem.source as ShoppingItem['source']) ?? 'manual',
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<ShoppingItem[]>(KEY, (old = []) => [...old, placeholder]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShoppingItem> }) =>
      shoppingApi.update(id, data),
    // Optimistic: apply the update immediately (e.g. checking/unchecking an item)
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<ShoppingItem[]>(KEY);
      qc.setQueryData<ShoppingItem[]>(KEY, (old = []) =>
        old.map((item) => (item.id === id ? { ...item, ...data } : item)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shoppingApi.delete,
    // Optimistic: remove the row immediately
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<ShoppingItem[]>(KEY);
      qc.setQueryData<ShoppingItem[]>(KEY, (old = []) => old.filter((item) => item.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useClearCheckedShopping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: shoppingApi.clearChecked,
    // Optimistic: remove checked items immediately
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<ShoppingItem[]>(KEY);
      qc.setQueryData<ShoppingItem[]>(KEY, (old = []) => old.filter((item) => !item.checked));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
