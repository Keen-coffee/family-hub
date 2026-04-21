import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { babysitterApi, type BabysitterContact, type BabysitterNote } from '../api/babysitter';

// ── Contacts ──────────────────────────────────────────────────────────────────

export function useBabysitterContacts() {
  return useQuery({
    queryKey: ['babysitter-contacts'],
    queryFn: () => babysitterApi.getContacts().then(r => r.data ?? []),
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<BabysitterContact, 'id' | 'sort_order' | 'created_at'>) =>
      babysitterApi.createContact(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['babysitter-contacts'] }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BabysitterContact> }) =>
      babysitterApi.updateContact(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['babysitter-contacts'] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => babysitterApi.deleteContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['babysitter-contacts'] }),
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function useBabysitterNotes() {
  return useQuery({
    queryKey: ['babysitter-notes'],
    queryFn: () => babysitterApi.getNotes().then(r => r.data ?? []),
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string }) => babysitterApi.createNote(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['babysitter-notes'] }),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BabysitterNote> }) =>
      babysitterApi.updateNote(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['babysitter-notes'] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => babysitterApi.deleteNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['babysitter-notes'] }),
  });
}
