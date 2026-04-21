import React, { useState } from 'react';
import {
  Baby, Phone, Plus, Trash2, Edit2, Check, X, Mail, User, FileText, AlertTriangle,
} from 'lucide-react';
import {
  useBabysitterContacts, useCreateContact, useUpdateContact, useDeleteContact,
  useBabysitterNotes, useCreateNote, useUpdateNote, useDeleteNote,
} from '../hooks/useBabysitter';
import type { BabysitterContact, BabysitterNote } from '../api/babysitter';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

// ── Contact form ──────────────────────────────────────────────────────────────

const EMPTY_CONTACT = { name: '', relationship: '', phone: '', email: '', notes: '' };

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: BabysitterContact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-surface-raised border border-slate-700/50 rounded-xl p-4 flex flex-col gap-2 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">{contact.name}</p>
          {contact.relationship && (
            <p className="text-xs text-accent/80">{contact.relationship}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {contact.phone && (
        <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-slate-300 hover:text-accent transition-colors">
          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {contact.phone}
        </a>
      )}
      {contact.email && (
        <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-slate-400 hover:text-accent transition-colors truncate">
          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{contact.email}</span>
        </a>
      )}
      {contact.notes && (
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{contact.notes}</p>
      )}
    </div>
  );
}

// ── Note card ─────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: BabysitterNote;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-surface-raised border border-slate-700/50 rounded-xl p-4 flex flex-col gap-2 group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-100">{note.title}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {note.content && (
        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{note.content}</p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BabysitterPage() {
  const { data: contacts = [], isLoading: loadingContacts } = useBabysitterContacts();
  const { data: notes = [], isLoading: loadingNotes } = useBabysitterNotes();

  const { mutate: createContact, isPending: creatingContact } = useCreateContact();
  const { mutate: updateContact } = useUpdateContact();
  const { mutate: deleteContact } = useDeleteContact();

  const { mutate: createNote, isPending: creatingNote } = useCreateNote();
  const { mutate: updateNote } = useUpdateNote();
  const { mutate: deleteNote } = useDeleteNote();

  // Contact modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [editContact, setEditContact] = useState<BabysitterContact | null>(null);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [deleteContactConfirm, setDeleteContactConfirm] = useState<BabysitterContact | null>(null);

  // Note modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editNote, setEditNote] = useState<BabysitterNote | null>(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [deleteNoteConfirm, setDeleteNoteConfirm] = useState<BabysitterNote | null>(null);

  const openAddContact = () => {
    setEditContact(null);
    setContactForm(EMPTY_CONTACT);
    setShowContactModal(true);
  };

  const openEditContact = (c: BabysitterContact) => {
    setEditContact(c);
    setContactForm({ name: c.name, relationship: c.relationship, phone: c.phone, email: c.email, notes: c.notes });
    setShowContactModal(true);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim()) return;
    if (editContact) {
      updateContact({ id: editContact.id, data: contactForm }, { onSuccess: () => setShowContactModal(false) });
    } else {
      createContact(contactForm, { onSuccess: () => { setContactForm(EMPTY_CONTACT); setShowContactModal(false); } });
    }
  };

  const openAddNote = () => {
    setEditNote(null);
    setNoteForm({ title: '', content: '' });
    setShowNoteModal(true);
  };

  const openEditNote = (n: BabysitterNote) => {
    setEditNote(n);
    setNoteForm({ title: n.title, content: n.content });
    setShowNoteModal(true);
  };

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.title.trim()) return;
    if (editNote) {
      updateNote({ id: editNote.id, data: noteForm }, { onSuccess: () => setShowNoteModal(false) });
    } else {
      createNote(noteForm, { onSuccess: () => { setNoteForm({ title: '', content: '' }); setShowNoteModal(false); } });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 shrink-0">
        <Baby className="w-5 h-5 text-accent" />
        <h1 className="text-base font-semibold text-slate-100 mr-auto">Babysitter</h1>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Emergency Contacts */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-semibold text-slate-200">Emergency Contacts</h2>
              </div>
              <button
                onClick={openAddContact}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {loadingContacts ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
                <User className="w-10 h-10 text-slate-700" />
                <p className="text-sm">No contacts yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {contacts.map(c => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    onEdit={() => openEditContact(c)}
                    onDelete={() => setDeleteContactConfirm(c)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Info / Notes */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">Info &amp; Notes</h2>
              </div>
              <button
                onClick={openAddNote}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {loadingNotes ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
                <FileText className="w-10 h-10 text-slate-700" />
                <p className="text-sm">No notes yet</p>
                <p className="text-xs text-slate-700 text-center">Add things like bedtime routine,<br />allergies, house rules, WiFi password…</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {notes.map(n => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    onEdit={() => openEditNote(n)}
                    onDelete={() => setDeleteNoteConfirm(n)}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
      </div>

      {/* Contact modal */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title={editContact ? 'Edit Contact' : 'Add Contact'}
        size="sm"
      >
        <form onSubmit={handleContactSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Name *</label>
              <input
                autoFocus
                value={contactForm.name}
                onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Grandma Sue"
                className="w-full px-3 py-2 bg-surface border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Relationship</label>
              <input
                value={contactForm.relationship}
                onChange={e => setContactForm(f => ({ ...f, relationship: e.target.value }))}
                placeholder="e.g. Grandma, Doctor"
                className="w-full px-3 py-2 bg-surface border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Phone</label>
              <input
                type="tel"
                value={contactForm.phone}
                onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(555) 555-5555"
                className="w-full px-3 py-2 bg-surface border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Email</label>
              <input
                type="email"
                value={contactForm.email}
                onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
                className="w-full px-3 py-2 bg-surface border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <textarea
                value={contactForm.notes}
                onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional info…"
                rows={2}
                className="w-full px-3 py-2 bg-surface border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowContactModal(false)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button type="submit" disabled={!contactForm.name.trim() || creatingContact} className="px-4 py-1.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-40">
              {editContact ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Note modal */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title={editNote ? 'Edit Note' : 'Add Note'}
        size="sm"
      >
        <form onSubmit={handleNoteSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Title *</label>
            <input
              autoFocus
              value={noteForm.title}
              onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Bedtime Routine, Allergies, WiFi Password"
              className="w-full px-3 py-2 bg-surface border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Content</label>
            <textarea
              value={noteForm.content}
              onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Details…"
              rows={5}
              className="w-full px-3 py-2 bg-surface border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowNoteModal(false)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button type="submit" disabled={!noteForm.title.trim() || creatingNote} className="px-4 py-1.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-40">
              {editNote ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete contact confirm */}
      <Modal isOpen={!!deleteContactConfirm} onClose={() => setDeleteContactConfirm(null)} title="Delete Contact" size="sm">
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-300">Remove <strong className="text-slate-100">{deleteContactConfirm?.name}</strong> from emergency contacts?</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteContactConfirm(null)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button
              onClick={() => { deleteContact(deleteContactConfirm!.id); setDeleteContactConfirm(null); }}
              className="px-4 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete note confirm */}
      <Modal isOpen={!!deleteNoteConfirm} onClose={() => setDeleteNoteConfirm(null)} title="Delete Note" size="sm">
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-300">Delete <strong className="text-slate-100">{deleteNoteConfirm?.title}</strong>?</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteNoteConfirm(null)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button
              onClick={() => { deleteNote(deleteNoteConfirm!.id); setDeleteNoteConfirm(null); }}
              className="px-4 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
