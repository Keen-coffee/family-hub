import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pantryApi } from '../api/pantry';
import type { PantrySection, PantryItem } from '../types';

export function usePantrySections() {
  return useQuery({
    queryKey: ['pantry', 'sections'],
    queryFn: async () => {
      const r = await pantryApi.getSections();
      return r.data ?? [];
    },
  });
}

export function usePantryItems(section_id?: string) {
  return useQuery({
    queryKey: ['pantry', 'items', section_id ?? 'all'],
    queryFn: async () => {
      const r = await pantryApi.getItems(section_id);
      return r.data ?? [];
    },
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pantryApi.createSection,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry', 'sections'] }),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PantrySection> }) =>
      pantryApi.updateSection(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry', 'sections'] }),
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pantryApi.deleteSection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pantry', 'sections'] });
      qc.invalidateQueries({ queryKey: ['pantry', 'items'] });
    },
  });
}

export function useCreatePantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pantryApi.createItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry', 'items'] }),
  });
}

export function useUpdatePantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PantryItem> }) =>
      pantryApi.updateItem(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['pantry', 'items'] });
      const snapshots = qc.getQueriesData<PantryItem[]>({ queryKey: ['pantry', 'items'] });
      qc.setQueriesData<PantryItem[]>({ queryKey: ['pantry', 'items'] }, (old = []) =>
        old.map(item => (item.id === id ? { ...item, ...data } : item)),
      );
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, val]) => qc.setQueryData(key, val));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['pantry', 'items'] }),
  });
}

export function useDeletePantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pantryApi.deleteItem,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['pantry', 'items'] });
      const snapshots = qc.getQueriesData<PantryItem[]>({ queryKey: ['pantry', 'items'] });
      qc.setQueriesData<PantryItem[]>({ queryKey: ['pantry', 'items'] }, (old = []) =>
        old.filter(item => item.id !== id),
      );
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, val]) => qc.setQueryData(key, val));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['pantry', 'items'] }),
  });
}

export function useAddPantryItemToShopping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity?: number }) =>
      pantryApi.addToShopping(id, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  });
}

export function useBulkDeletePantryItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pantryApi.bulkDeleteItems,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pantry', 'items'] });
    },
  });
}
