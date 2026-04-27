import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon as IconifyIcon } from '@iconify/react';
import {
  ShoppingCart, Package, Plus, Minus, Trash2, ArrowRight,
  CheckSquare, Square, ChevronDown, ChevronRight as ChevronRightIcon, ScanLine, Loader2,
  Refrigerator, Snowflake, Archive, Apple, Milk, Beef, Wheat, Wine,
  Cookie, SprayCan, PawPrint, Fish, Egg, Coffee, Baby, Carrot, Flame, ShoppingBag,
  Search, Pencil, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import MassImportModal from '../components/pantry/MassImportModal';

// Named icon definitions for pantry sections
const SECTION_ICON_LIST: { id: string; label: string; icon: LucideIcon; color: string }[] = [
  { id: 'fridge',     label: 'Fridge',      icon: Refrigerator, color: '#60A5FA' },
  { id: 'freezer',    label: 'Freezer',     icon: Snowflake,    color: '#93C5FD' },
  { id: 'pantry',     label: 'Pantry',      icon: Archive,      color: '#FBBF24' },
  { id: 'produce',    label: 'Produce',     icon: Carrot,       color: '#34D399' },
  { id: 'fruit',      label: 'Fruit',       icon: Apple,        color: '#F87171' },
  { id: 'dairy',      label: 'Dairy',       icon: Milk,         color: '#E2E8F0' },
  { id: 'meat',       label: 'Meat',        icon: Beef,         color: '#FB923C' },
  { id: 'seafood',    label: 'Seafood',     icon: Fish,         color: '#38BDF8' },
  { id: 'bakery',     label: 'Bakery',      icon: Wheat,        color: '#D97706' },
  { id: 'beverages',  label: 'Beverages',   icon: Wine,         color: '#A78BFA' },
  { id: 'coffee',     label: 'Coffee',      icon: Coffee,       color: '#92400E' },
  { id: 'snacks',     label: 'Snacks',      icon: Cookie,       color: '#F59E0B' },
  { id: 'eggs',       label: 'Eggs',        icon: Egg,          color: '#FDE68A' },
  { id: 'cleaning',   label: 'Cleaning',    icon: SprayCan,     color: '#6EE7B7' },
  { id: 'pet',        label: 'Pet',         icon: PawPrint,     color: '#C4B5FD' },
  { id: 'baby',       label: 'Baby',        icon: Baby,         color: '#FCA5A5' },
  { id: 'frozen',     label: 'Frozen',      icon: Flame,        color: '#7DD3FC' },
  { id: 'other',      label: 'Other',       icon: ShoppingBag,  color: '#94A3B8' },
];

const SECTION_ICON_MAP = Object.fromEntries(SECTION_ICON_LIST.map(i => [i.id, i]));

function GroceryIcon({ id, size = 18, className = '' }: { id: string; size?: number; className?: string }) {
  if (id.includes(':')) {
    return <IconifyIcon icon={id} width={size} height={size} className={className} style={{ flexShrink: 0 }} />;
  }
  const entry = SECTION_ICON_MAP[id];
  if (entry) {
    const Icon = entry.icon;
    return <Icon width={size} height={size} className={className} style={{ color: entry.color, flexShrink: 0 }} />;
  }
  return <span className="text-lg leading-none" style={{ lineHeight: 1 }}>{id}</span>;
}

// Auto-scrolling text — animates when text overflows its container
function ScrollingText({ text, className = '' }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [dist, setDist] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    const check = () => {
      const containerW = el.getBoundingClientRect().width;
      const textW = inner.scrollWidth;
      setDist(textW > containerW + 2 ? -(textW - containerW + 8) : 0);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      <span
        ref={innerRef}
        className="whitespace-nowrap inline-block"
        style={dist !== 0 ? {
          animation: 'pantry-marquee 6s ease-in-out infinite',
          '--marquee-dist': `${dist}px`,
        } as React.CSSProperties : {}}
      >
        {text}
      </span>
    </div>
  );
}

import {
  usePantrySections, usePantryItems,
  useCreateSection, useDeleteSection,
  useCreatePantryItem, useUpdatePantryItem, useDeletePantryItem, useAddPantryItemToShopping,
  useBulkDeletePantryItems,
} from '../hooks/usePantry';
import { useShoppingList, useCreateShoppingItem, useUpdateShoppingItem, useDeleteShoppingItem, useClearCheckedShopping } from '../hooks/useShopping';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import BarcodeScanner from '../components/common/BarcodeScanner';
import type { PantryItem, PantrySection } from '../types';

type MainTab = 'pantry' | 'shopping';

// ── PantryItemRow ─────────────────────────────────────────────────────────────

interface PantryItemRowProps {
  item: PantryItem;
  editMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (item: PantryItem) => void;
}

function PantryItemRow({ item, editMode, selected, onToggleSelect, onEdit }: PantryItemRowProps) {
  const { mutate: update } = useUpdatePantryItem();
  const { mutate: addToShopping, isPending: adding } = useAddPantryItemToShopping();

  const adjust = (delta: number) => {
    const next = Math.max(0, Number(item.quantity) + delta);
    update({ id: item.id, data: { quantity: next } });
  };

  const displayName = item.generic_name?.trim() || item.name;
  const brandName = item.brand?.trim();
  const belowMin = item.min_quantity > 0 && item.quantity <= item.min_quantity;

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-raised group ${selected ? 'bg-accent/10' : ''}`}
      onClick={editMode ? () => onEdit(item) : undefined}
      style={editMode ? { cursor: 'pointer' } : {}}
    >
      {editMode && (
        <button
          onClick={e => { e.stopPropagation(); onToggleSelect(item.id); }}
          className="shrink-0 text-slate-400 hover:text-accent"
        >
          {selected ? <CheckSquare className="w-4 h-4 text-accent" /> : <Square className="w-4 h-4" />}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <ScrollingText text={displayName} className="text-sm text-slate-200" />
        {brandName && <p className="text-[11px] text-slate-500 truncate leading-tight">{brandName}</p>}
      </div>
      {belowMin && (
        <span className="shrink-0 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/20" title={`Below min (${item.min_quantity})`} />
      )}
      {item.unit && <span className="text-xs text-slate-500 shrink-0">{item.unit}</span>}
      {!editMode && (
        <>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => adjust(-1)} className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-slate-300">
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-sm font-semibold text-slate-100">{item.quantity}</span>
            <button onClick={() => adjust(1)} className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-slate-300">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={() => addToShopping({ id: item.id, quantity: 1 })}
            title="Add to shopping list"
            disabled={adding}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-accent hover:bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────

interface SectionCardProps {
  section: PantrySection;
  items: PantryItem[];
  onAddItem: (s: PantrySection) => void;
  editMode: boolean;
  selectedItemIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEditItem: (item: PantryItem) => void;
}

function SectionCard({ section, items, onAddItem, editMode, selectedItemIds, onToggleSelect, onEditItem }: SectionCardProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-surface border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-raised select-none" onClick={() => setOpen(o => !o)}>
        <GroceryIcon id={section.icon} size={18} />
        <span className="font-semibold text-slate-200 flex-1 text-sm">{section.name}</span>
        <span className="text-xs text-slate-500">{items.length}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRightIcon className="w-4 h-4 text-slate-500" />}
        {!editMode && (
          <button onClick={e => { e.stopPropagation(); onAddItem(section); }} className="p-1 rounded hover:bg-accent/10 hover:text-accent text-slate-400" title="Add item">
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="px-2 pb-2">
          {items.length === 0
            ? <p className="text-xs text-slate-600 italic px-2 py-1">No items — click + to add</p>
            : items.map(item => (
                <PantryItemRow
                  key={item.id}
                  item={item}
                  editMode={editMode}
                  selected={selectedItemIds.has(item.id)}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEditItem}
                />
              ))}
        </div>
      )}
    </div>
  );
}

// ── GroceryPage ───────────────────────────────────────────────────────────────

export default function GroceryPage() {
  const [tab, setTab] = useState<MainTab>('pantry');
  const { data: sections = [], isLoading: sectionsLoading } = usePantrySections();
  const { data: allItems = [] } = usePantryItems();
  const { mutate: createSection } = useCreateSection();
  const { mutate: deleteSection } = useDeleteSection();
  const { mutate: createItem } = useCreatePantryItem();
  const { mutate: updateItem } = useUpdatePantryItem();
  const { mutate: bulkDelete } = useBulkDeletePantryItems();
  const { data: shoppingItems = [], isLoading: shoppingLoading } = useShoppingList();
  const { mutate: createShoppingItem } = useCreateShoppingItem();
  const { mutate: updateShoppingItem } = useUpdateShoppingItem();
  const { mutate: deleteShoppingItem } = useDeleteShoppingItem();
  const { mutate: clearChecked } = useClearCheckedShopping();

  // UI state
  const [editMode, setEditMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  // Add Section modal
  const [showAddSection, setShowAddSection] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [sectionIcon, setSectionIcon] = useState('pantry');
  const [iconSearchResults, setIconSearchResults] = useState<string[]>([]);
  const [iconSearching, setIconSearching] = useState(false);
  const iconSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add Item modal
  const [showAddItem, setShowAddItem] = useState(false);
  const [targetSection, setTargetSection] = useState<PantrySection | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemBarcode, setNewItemBarcode] = useState('');

  // Add Shopping modal
  const [showAddShopping, setShowAddShopping] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopQty, setNewShopQty] = useState(1);
  const [newShopUnit, setNewShopUnit] = useState('');

  // Barcode scanner
  const [showScannerFor, setShowScannerFor] = useState<'item' | 'shopping' | null>(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  // Mass import
  const [showMassImport, setShowMassImport] = useState(false);

  // Mass AI parse state
  const [aiParseProgress, setAiParseProgress] = useState<{ current: number; total: number } | null>(null);

  // Edit item form state
  const [editForm, setEditForm] = useState<{
    generic_name: string; brand: string; quantity: number; unit: string; min_quantity: number; section_id: string; barcode: string;
  }>({ generic_name: '', brand: '', quantity: 1, unit: '', min_quantity: 0, section_id: '', barcode: '' });

  useEffect(() => {
    if (editingItem) {
      setEditForm({
        generic_name: editingItem.generic_name?.trim() || editingItem.name,
        brand: editingItem.brand ?? '',
        quantity: editingItem.quantity,
        unit: editingItem.unit ?? '',
        min_quantity: editingItem.min_quantity ?? 0,
        section_id: editingItem.section_id,
        barcode: editingItem.barcode ?? '',
      });
    }
  }, [editingItem]);

  // Exit edit mode when tab changes
  useEffect(() => { setEditMode(false); setSelectedItemIds(new Set()); }, [tab]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleOpenAddItem = (s: PantrySection) => {
    setTargetSection(s);
    setNewItemName(''); setNewItemQty(1); setNewItemUnit(''); setNewItemBarcode('');
    setShowAddItem(true);
  };

  const handleBarcodeScan = async (barcode: string, target: 'item' | 'shopping') => {
    setShowScannerFor(null);
    setBarcodeLoading(true);
    try {
      const r = await fetch(`/api/openfoodfacts/${encodeURIComponent(barcode)}`);
      const data = await r.json();
      if (target === 'item') setNewItemBarcode(barcode);
      if (data.success && data.data?.name) {
        const name = data.data.brand ? `${data.data.brand} ${data.data.name}` : data.data.name;
        if (target === 'item') setNewItemName(name);
        else setNewShopName(name);
      }
    } catch { /* ignore */ } finally {
      setBarcodeLoading(false);
    }
  };

  // Debounced Iconify search
  useEffect(() => {
    if (iconSearchTimer.current) clearTimeout(iconSearchTimer.current);
    const q = sectionName.trim();
    if (!q) { setIconSearchResults([]); return; }
    iconSearchTimer.current = setTimeout(async () => {
      setIconSearching(true);
      try {
        const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=30`);
        const data = await res.json();
        setIconSearchResults(data.icons ?? []);
      } catch { setIconSearchResults([]); } finally { setIconSearching(false); }
    }, 350);
  }, [sectionName]);

  const handleCreateSection = () => {
    if (!sectionName.trim()) return;
    createSection({ name: sectionName.trim(), icon: sectionIcon });
    setSectionName(''); setSectionIcon('pantry'); setIconSearchResults([]); setShowAddSection(false);
  };

  const handleCreateItem = () => {
    if (!targetSection || !newItemName.trim()) return;
    createItem({ section_id: targetSection.id, name: newItemName.trim(), quantity: newItemQty, unit: newItemUnit, barcode: newItemBarcode });
    setShowAddItem(false);
  };

  const handleCreateShoppingItem = () => {
    if (!newShopName.trim()) return;
    createShoppingItem({ name: newShopName.trim(), quantity: newShopQty, unit: newShopUnit });
    setNewShopName(''); setNewShopQty(1); setNewShopUnit(''); setShowAddShopping(false);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateItem({
      id: editingItem.id,
      data: {
        generic_name: editForm.generic_name.trim(),
        brand: editForm.brand.trim(),
        name: editForm.generic_name.trim() || editingItem.name,
        quantity: editForm.quantity,
        unit: editForm.unit.trim(),
        min_quantity: editForm.min_quantity,
        section_id: editForm.section_id,
        barcode: editForm.barcode.trim() || undefined,
      },
    });
    setEditingItem(null);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedItemIds);
    if (ids.length === 0) return;
    bulkDelete(ids, {
      onSuccess: () => { setSelectedItemIds(new Set()); setEditMode(false); },
    });
  };

  const handleMassParseAI = async () => {
    const unparsed = allItems.filter(it => !it.generic_name?.trim());
    if (unparsed.length === 0) {
      // Re-parse all items if everything is already parsed
      const all = allItems;
      if (all.length === 0) return;
      setAiParseProgress({ current: 0, total: all.length });
      for (let i = 0; i < all.length; i++) {
        const item = all[i];
        const raw = [item.brand, item.generic_name?.trim() || item.name].filter(Boolean).join(' ');
        try {
          const r = await fetch('/api/ai/parse-product-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: raw }),
          });
          const data = await r.json() as { success: boolean; data?: { generic_name: string; brand: string } };
          if (data.success && data.data) {
            updateItem({ id: item.id, data: { generic_name: data.data.generic_name, brand: data.data.brand, name: data.data.generic_name || item.name } });
          }
        } catch { /* skip */ }
        setAiParseProgress({ current: i + 1, total: all.length });
      }
    } else {
      setAiParseProgress({ current: 0, total: unparsed.length });
      for (let i = 0; i < unparsed.length; i++) {
        const item = unparsed[i];
        const raw = item.name;
        try {
          const r = await fetch('/api/ai/parse-product-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: raw }),
          });
          const data = await r.json() as { success: boolean; data?: { generic_name: string; brand: string } };
          if (data.success && data.data) {
            updateItem({ id: item.id, data: { generic_name: data.data.generic_name, brand: data.data.brand, name: data.data.generic_name || item.name } });
          }
        } catch { /* skip */ }
        setAiParseProgress({ current: i + 1, total: unparsed.length });
      }
    }
    setAiParseProgress(null);
  };

  const handleMassImport = async (
    sectionId: string,
    items: { name: string; generic_name: string; brand: string; barcode: string; quantity: number; unit: string }[],
  ) => {
    for (const item of items) {
      await new Promise<void>(resolve => {
        createItem(
          {
            section_id: sectionId,
            name: item.name,
            generic_name: item.generic_name,
            brand: item.brand,
            barcode: item.barcode,
            quantity: item.quantity,
            unit: item.unit,
          },
          { onSettled: () => resolve() },
        );
      });
    }
  };

  // ── Filtering ────────────────────────────────────────────────────────────────

  const q = searchQuery.trim().toLowerCase();
  const filteredSections = sections.filter(section => {
    if (!q) return true;
    const sectionItems = allItems.filter(i => i.section_id === section.id);
    const hasMatch = sectionItems.some(i => {
      const name = (i.generic_name?.trim() || i.name).toLowerCase();
      const brand = (i.brand ?? '').toLowerCase();
      return name.includes(q) || brand.includes(q);
    });
    return hasMatch || section.name.toLowerCase().includes(q);
  });

  const getFilteredItems = (sectionId: string) => {
    const items = allItems.filter(i => i.section_id === sectionId);
    if (!q) return items;
    return items.filter(i => {
      const name = (i.generic_name?.trim() || i.name).toLowerCase();
      const brand = (i.brand ?? '').toLowerCase();
      return name.includes(q) || brand.includes(q);
    });
  };

  const unchecked = shoppingItems.filter(i => !i.checked);
  const checked = shoppingItems.filter(i => i.checked);
  const selectedCount = selectedItemIds.size;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 shrink-0">
        <Package className="w-5 h-5 text-accent" />
        <h1 className="text-base font-semibold text-slate-100 mr-auto">Pantry & Grocery</h1>
        <div className="flex bg-surface-raised rounded-lg overflow-hidden border border-slate-700/50">
          {(['pantry', 'shopping'] as MainTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${tab === t ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {t === 'pantry' ? 'Pantry' : `Shopping${unchecked.length ? ` (${unchecked.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── PANTRY TAB ── */}
      {tab === 'pantry' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {/* Pantry toolbar */}
          <div className="space-y-2 mb-3">
            {/* Search + Edit row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search pantry…"
                  className="w-full pl-8 pr-3 py-1.5 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-accent placeholder-slate-600"
                />
              </div>
              <button
                onClick={() => { setEditMode(m => !m); setSelectedItemIds(new Set()); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  editMode
                    ? 'bg-accent/20 border-accent/60 text-accent'
                    : 'bg-surface-raised border-slate-600 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                {editMode ? 'Done' : 'Edit'}
              </button>
            </div>

            {/* Action buttons row */}
            <div className="flex items-center justify-end gap-2">
              {editMode ? (
                <>
                  <button
                    onClick={handleMassParseAI}
                    disabled={!!aiParseProgress}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg disabled:opacity-60"
                  >
                    {aiParseProgress
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Parsing {aiParseProgress.current}/{aiParseProgress.total}…</>
                      : <><Sparkles className="w-3.5 h-3.5" /> {allItems.some(i => !i.generic_name?.trim()) ? `Parse Unparsed (${allItems.filter(i => !i.generic_name?.trim()).length})` : 'Re-parse All'}</>}
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedCount === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete{selectedCount > 0 ? ` (${selectedCount})` : ''}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowMassImport(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-raised hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg">
                    <ScanLine className="w-3.5 h-3.5" /> Mass Import
                  </button>
                  <button onClick={() => setShowAddSection(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-lg">
                    <Plus className="w-3.5 h-3.5" /> Add Section
                  </button>
                </>
              )}
            </div>
          </div>

          {sectionsLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : filteredSections.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
              <Package className="w-10 h-10 text-slate-700" />
              <p className="text-sm">{q ? 'No matching items' : 'No sections yet'}</p>
              {!q && <p className="text-xs text-center text-slate-600">Add sections like "Fridge", "Pantry", or "Deep Freezer"</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSections.map(s => (
                <SectionCard
                  key={s.id}
                  section={s}
                  items={getFilteredItems(s.id)}
                  onAddItem={handleOpenAddItem}
                  editMode={editMode}
                  selectedItemIds={selectedItemIds}
                  onToggleSelect={toggleSelectItem}
                  onEditItem={setEditingItem}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SHOPPING TAB ── */}
      {tab === 'shopping' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setShowAddShopping(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-lg">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
            {checked.length > 0 && (
              <button onClick={() => clearChecked(undefined)} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Clear checked ({checked.length})
              </button>
            )}
          </div>
          {shoppingLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : shoppingItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
              <ShoppingCart className="w-10 h-10 text-slate-700" />
              <p className="text-sm">Shopping list is empty</p>
            </div>
          ) : (
            <div className="space-y-1">
              {unchecked.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface-raised group">
                  <button onClick={() => updateShoppingItem({ id: item.id, data: { checked: true } })} className="shrink-0 text-slate-400 hover:text-emerald-400">
                    <Square className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-sm text-slate-200">{item.name}</span>
                  {(item.quantity > 1 || item.unit) && <span className="text-xs text-slate-500 shrink-0">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>}
                  {item.source !== 'manual' && <span className="text-[10px] bg-slate-700 text-slate-400 rounded px-1.5 py-0.5 shrink-0">{item.source}</span>}
                  <button onClick={() => deleteShoppingItem(item.id)} className="shrink-0 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {checked.length > 0 && (
                <>
                  <p className="text-xs text-slate-600 uppercase tracking-wider pt-3 pb-1 px-2">Checked off</p>
                  {checked.map(item => (
                    <div key={item.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface-raised group opacity-50">
                      <button onClick={() => updateShoppingItem({ id: item.id, data: { checked: false } })} className="shrink-0 text-emerald-500 hover:text-slate-400">
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <span className="flex-1 text-sm text-slate-400 line-through">{item.name}</span>
                      <button onClick={() => deleteShoppingItem(item.id)} className="shrink-0 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Add Section */}
      <Modal isOpen={showAddSection} onClose={() => { setShowAddSection(false); setSectionName(''); setSectionIcon('pantry'); setIconSearchResults([]); }} title="Add Section" size="sm">
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Name</label>
            <input autoFocus value={sectionName} onChange={e => setSectionName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateSection()}
              placeholder="e.g. Fridge, Pantry, Deep Freezer"
              className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-raised border border-slate-600 flex items-center justify-center">
              <GroceryIcon id={sectionIcon} size={22} />
            </div>
            <span className="text-xs text-slate-500">
              {sectionIcon.includes(':') ? sectionIcon : (SECTION_ICON_MAP[sectionIcon]?.label ?? sectionIcon)}
            </span>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400">{sectionName.trim() ? 'Search results' : 'Default icons'}</label>
              {iconSearching && <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />}
            </div>
            {iconSearchResults.length > 0 ? (
              <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                {iconSearchResults.map(iconId => (
                  <button key={iconId} onClick={() => setSectionIcon(iconId)} title={iconId}
                    className={`flex items-center justify-center p-1.5 rounded-lg transition-colors ${sectionIcon === iconId ? 'bg-accent/20 border border-accent/60' : 'bg-surface-raised hover:bg-slate-700 border border-transparent'}`}>
                    <GroceryIcon id={iconId} size={20} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1.5">
                {SECTION_ICON_LIST.map(({ id, label }) => (
                  <button key={id} onClick={() => setSectionIcon(id)} title={label}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${sectionIcon === id ? 'bg-accent/20 border border-accent/60' : 'bg-surface-raised hover:bg-slate-700 border border-transparent'}`}>
                    <GroceryIcon id={id} size={20} />
                    <span className="text-[9px] text-slate-400 leading-none truncate w-full text-center">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => { setShowAddSection(false); setSectionName(''); setSectionIcon('pantry'); setIconSearchResults([]); }} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button onClick={handleCreateSection} disabled={!sectionName.trim()} className="px-4 py-1.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-40">Create</button>
          </div>
        </div>
      </Modal>

      {/* Add Item */}
      <Modal isOpen={showAddItem} onClose={() => setShowAddItem(false)} title={`Add to ${targetSection?.name ?? ''}`} size="sm">
        <div className="p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">Item name</label>
              <button onClick={() => setShowScannerFor('item')} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80">
                <ScanLine className="w-3 h-3" /> Scan barcode
              </button>
            </div>
            {barcodeLoading && showScannerFor === null ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span className="text-xs text-slate-400">Looking up product…</span>
              </div>
            ) : (
              <input autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateItem()}
                placeholder="e.g. Milk, Chicken Breast"
                className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Quantity</label>
              <input type="number" min={0} value={newItemQty} onChange={e => setNewItemQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Unit (optional)</label>
              <input value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} placeholder="lbs, gal, pkg…"
                className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowAddItem(false)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button onClick={handleCreateItem} disabled={!newItemName.trim()} className="px-4 py-1.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-40">Add</button>
          </div>
        </div>
      </Modal>

      {/* Add Shopping Item */}
      <Modal isOpen={showAddShopping} onClose={() => setShowAddShopping(false)} title="Add to Shopping List" size="sm">
        <div className="p-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">Item name</label>
              <button onClick={() => setShowScannerFor('shopping')} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80">
                <ScanLine className="w-3 h-3" /> Scan barcode
              </button>
            </div>
            {barcodeLoading && showScannerFor === null ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span className="text-xs text-slate-400">Looking up product…</span>
              </div>
            ) : (
              <input autoFocus value={newShopName} onChange={e => setNewShopName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateShoppingItem()}
                placeholder="e.g. Eggs, Bread"
                className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Quantity</label>
              <input type="number" min={1} value={newShopQty} onChange={e => setNewShopQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Unit (optional)</label>
              <input value={newShopUnit} onChange={e => setNewShopUnit(e.target.value)} placeholder="lbs, gal…"
                className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowAddShopping(false)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button onClick={handleCreateShoppingItem} disabled={!newShopName.trim()} className="px-4 py-1.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-40">Add</button>
          </div>
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Item" size="sm">
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Item (generic name)</label>
            <input value={editForm.generic_name} onChange={e => setEditForm(f => ({ ...f, generic_name: e.target.value }))}
              placeholder="e.g. Beef Hot Dog"
              className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Brand (optional)</label>
            <input value={editForm.brand} onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))}
              placeholder="e.g. Applegate Naturals"
              className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Quantity</label>
              <input type="number" min={0} value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Unit</label>
              <input value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} placeholder="optional"
                className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Min quantity (auto-add to shopping)</label>
            <input type="number" min={0} step={1} value={editForm.min_quantity} onChange={e => setEditForm(f => ({ ...f, min_quantity: Math.max(0, Math.floor(Number(e.target.value))) }))}
              className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Barcode (UPC)</label>
            <input value={editForm.barcode} onChange={e => setEditForm(f => ({ ...f, barcode: e.target.value }))}
              placeholder="optional"
              className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Section</label>
            <select value={editForm.section_id} onChange={e => setEditForm(f => ({ ...f, section_id: e.target.value }))}
              className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent">
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setEditingItem(null)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button onClick={handleSaveEdit} className="px-4 py-1.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg">Save</button>
          </div>
        </div>
      </Modal>

      {showScannerFor && (
        <BarcodeScanner
          onScan={barcode => handleBarcodeScan(barcode, showScannerFor)}
          onClose={() => setShowScannerFor(null)}
        />
      )}

      <MassImportModal
        isOpen={showMassImport}
        onClose={() => setShowMassImport(false)}
        sections={sections}
        onImport={handleMassImport}
      />
    </div>
  );
}
