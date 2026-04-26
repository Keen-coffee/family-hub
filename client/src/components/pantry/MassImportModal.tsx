import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ScanLine, Loader2, CheckCircle, AlertTriangle, ArrowRight, X, Ban, Sparkles } from 'lucide-react';
import Modal from '../common/Modal';
import type { PantrySection } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LookupResult {
  barcode: string;
  found: boolean;
  name: string | null;
  brand: string | null;
  quantity: string | null;
}

interface ReviewItem {
  barcode: string;
  generic_name: string;
  brand: string;
  unit: string;
  qty: number;
  found: boolean;
  skip: boolean;
  aiParsed: boolean;
}

type Step = 'scan' | 'looking' | 'review' | 'done';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sections: PantrySection[];
  onImport: (sectionId: string, items: { name: string; generic_name: string; brand: string; barcode: string; quantity: number; unit: string }[]) => Promise<void>;
}

// OpenFoodFacts enforces 15 req/min per IP — space requests ~4.5 s apart.
const OFF_DELAY_MS = 4500;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function aiParseName(raw: string): Promise<{ generic_name: string; brand: string } | null> {
  try {
    const r = await fetch('/api/ai/parse-product-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: raw }),
    });
    const data = await r.json() as { success: boolean; data?: { generic_name: string; brand: string } };
    return data.success && data.data ? data.data : null;
  } catch {
    return null;
  }
}

function secsRemaining(done: number, total: number): string {
  const left = (total - done) * (OFF_DELAY_MS / 1000);
  if (left < 60) return `~${Math.round(left)}s remaining`;
  return `~${Math.round(left / 60)}m remaining`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MassImportModal({ isOpen, onClose, sections, onImport }: Props) {
  const [step, setStep] = useState<Step>('scan');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [scanned, setScanned] = useState<Record<string, number>>({});
  const [barcodeInput, setBarcodeInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [lookupProgress, setLookupProgress] = useState<{ current: number; total: number; label: string }>({ current: 0, total: 0, label: '' });
  const cancelRef = useRef(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [reParsingIdx, setReParsingIdx] = useState<number | null>(null);

  // Auto-select first section
  useEffect(() => {
    if (isOpen && sections.length > 0 && !selectedSection) {
      setSelectedSection(sections[0].id);
    }
  }, [isOpen, sections, selectedSection]);

  // Focus barcode input when in scan step
  useEffect(() => {
    if (isOpen && step === 'scan') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, step]);

  // Reset on close
  const handleClose = useCallback(() => {
    cancelRef.current = true;
    setStep('scan');
    setScanned({});
    setBarcodeInput('');
    setReviewItems([]);
    setLookupProgress({ current: 0, total: 0, label: '' });
    setImporting(false);
    setImportedCount(0);
    onClose();
  }, [onClose]);

  // Capture barcode from USB scanner (sends barcode + Enter)
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = barcodeInput.trim();
      if (/^\d{6,14}$/.test(val)) {
        setScanned(prev => ({ ...prev, [val]: (prev[val] ?? 0) + 1 }));
      }
      setBarcodeInput('');
    }
  };

  const removeBarcode = (b: string) => setScanned(prev => { const { [b]: _, ...rest } = prev; return rest; });

  // Sequential lookup — one barcode at a time respecting the 15 req/min limit.
  // After OFB returns a name, immediately calls AI to parse brand + generic.
  const handleProcess = async () => {
    const barcodeList = Object.entries(scanned); // [barcode, count]
    if (barcodeList.length === 0) return;
    cancelRef.current = false;
    setLookupProgress({ current: 0, total: barcodeList.length, label: 'Looking up product…' });
    setStep('looking');

    const results: ReviewItem[] = [];

    for (let i = 0; i < barcodeList.length; i++) {
      if (cancelRef.current) break;

      const [barcode, count] = barcodeList[i];
      let reviewItem: ReviewItem = { barcode, generic_name: '', brand: '', unit: '', qty: count, found: false, skip: false, aiParsed: false };

      try {
        setLookupProgress({ current: i, total: barcodeList.length, label: 'Looking up barcode…' });
        const r = await fetch(`/api/openfoodfacts/${encodeURIComponent(barcode)}`);
        const data = await r.json() as { success: boolean; data?: LookupResult };
        if (data.success && data.data && data.data.name) {
          const res = data.data;
          const rawName = res.brand ? `${res.brand} ${res.name}` : res.name!;

          // Try AI parse — runs in parallel with the delay below
          setLookupProgress({ current: i, total: barcodeList.length, label: 'Parsing with AI…' });
          const parsed = await aiParseName(rawName);

          reviewItem = {
            barcode,
            generic_name: parsed?.generic_name ?? rawName,
            brand: parsed?.brand ?? (res.brand ?? ''),
            unit: '',
            qty: count,
            found: true,
            skip: false,
            aiParsed: !!parsed,
          };
        }
      } catch {
        // keep defaults
      }

      results.push(reviewItem);
      setLookupProgress({ current: i + 1, total: barcodeList.length, label: 'Looking up barcode…' });

      // Wait between OFB requests — skip after the last item.
      if (i < barcodeList.length - 1 && !cancelRef.current) {
        await new Promise(resolve => setTimeout(resolve, OFF_DELAY_MS));
      }
    }

    if (!cancelRef.current) {
      setReviewItems(results);
      setStep('review');
    }
  };

  const handleCancelLookup = () => {
    cancelRef.current = true;
    setStep('scan');
    setLookupProgress({ current: 0, total: 0, label: '' });
  };

  // Re-run AI parse on a single review item
  const handleReparse = async (idx: number) => {
    const item = reviewItems[idx];
    const raw = [item.brand, item.generic_name].filter(Boolean).join(' ') || item.generic_name;
    if (!raw.trim()) return;
    setReParsingIdx(idx);
    const parsed = await aiParseName(raw);
    if (parsed) {
      setReviewItems(prev => prev.map((it, i) => i === idx
        ? { ...it, generic_name: parsed.generic_name, brand: parsed.brand, aiParsed: true }
        : it
      ));
    }
    setReParsingIdx(null);
  };

  const updateReviewItem = (barcode: string, patch: Partial<ReviewItem>) => {
    setReviewItems(prev => prev.map(it => it.barcode === barcode ? { ...it, ...patch } : it));
  };

  const handleImport = async () => {
    const toImport = reviewItems.filter(it => !it.skip && it.generic_name.trim());
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      await onImport(selectedSection, toImport.map(it => ({
        name: it.generic_name.trim(),
        generic_name: it.generic_name.trim(),
        brand: it.brand.trim(),
        barcode: it.barcode,
        quantity: it.qty,
        unit: it.unit.trim(),
      })));
      setImportedCount(toImport.length);
      setStep('done');
    } finally {
      setImporting(false);
    }
  };

  const importable = reviewItems.filter(it => !it.skip && it.generic_name.trim()).length;
  const skipped = reviewItems.filter(it => it.skip).length;
  const unnamed = reviewItems.filter(it => !it.skip && !it.generic_name.trim()).length;

  const sectionName = sections.find(s => s.id === selectedSection)?.name ?? '';

  const STEP_LABELS: Record<Step, string> = { scan: 'Scan', looking: 'Lookup', review: 'Review', done: 'Done' };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Mass Barcode Import" size="lg">
      {/* Step indicators */}
      <div className="flex items-center gap-1 px-5 pt-4 pb-2">
        {(['scan', 'review', 'done'] as Step[]).map((s, i) => {
          const stepOrder: Step[] = ['scan', 'review', 'done'];
          const activeStep = step === 'looking' ? 'scan' : step;
          const idx = stepOrder.indexOf(activeStep);
          const active = (step === 'looking' && s === 'scan') || step === s;
          const past = i < idx;
          return (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${active ? 'text-accent' : past ? 'text-emerald-400' : 'text-slate-600'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${active ? 'border-accent bg-accent/10 text-accent' : past ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400' : 'border-slate-700 text-slate-600'}`}>{i + 1}</span>
                {STEP_LABELS[s]}
              </div>
              {i < 2 && <div className="flex-1 h-px bg-slate-700 mx-1" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── SCAN STEP ── */}
      {step === 'scan' && (
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Target section</label>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent"
            >
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5" /> Scan barcodes
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              placeholder="Point scanner here and scan items…"
              className="w-full px-3 py-2 bg-surface-raised border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-accent placeholder-slate-600"
            />
            <p className="mt-1 text-[11px] text-slate-600">USB barcode readers work automatically — each scan adds to the list below.</p>
          </div>

          {Object.keys(scanned).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400">{Object.keys(scanned).length} unique barcode{Object.keys(scanned).length !== 1 ? 's' : ''} scanned</span>
                <button onClick={() => setScanned({})} className="text-[11px] text-slate-600 hover:text-red-400">Clear all</button>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-0.5 rounded-lg border border-slate-700 bg-surface-raised p-2">
                {Object.entries(scanned).map(([b, count]) => (
                  <div key={b} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700/50 group">
                    <span className="flex-1 font-mono text-xs text-slate-300">{b}</span>
                    {count > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded font-medium">×{count}</span>
                    )}
                    <button onClick={() => removeBarcode(b)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {Object.keys(scanned).length > 1 && (
                <p className="mt-1.5 text-[11px] text-slate-600">
                  Lookup takes ~{Math.round((Object.keys(scanned).length * OFF_DELAY_MS) / 1000)}s — rate-limited by OpenFoodFacts
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={handleClose} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button
              onClick={handleProcess}
              disabled={Object.keys(scanned).length === 0 || !selectedSection}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-40"
            >
              <ArrowRight className="w-4 h-4" />
              Process {Object.keys(scanned).length} item{Object.keys(scanned).length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── LOOKING STEP ── */}
      {step === 'looking' && (
        <div className="p-8 flex flex-col items-center gap-5">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
          <div className="text-center">
            <p className="text-slate-100 font-medium">
              {lookupProgress.label || 'Looking up…'} ({lookupProgress.current} of {lookupProgress.total})
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {lookupProgress.current < lookupProgress.total
                ? secsRemaining(lookupProgress.current, lookupProgress.total)
                : 'Finishing up…'}
            </p>
          </div>
          <div className="w-full max-w-xs bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${lookupProgress.total > 0 ? (lookupProgress.current / lookupProgress.total) * 100 : 0}%` }}
            />
          </div>
          <button
            onClick={handleCancelLookup}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-500/40 rounded-lg transition-colors"
          >
            <Ban className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      )}

      {/* ── REVIEW STEP ── */}
      {step === 'review' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> {reviewItems.filter(i => i.found).length} found</span>
            <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3.5 h-3.5" /> {reviewItems.filter(i => !i.found).length} not found</span>
            <span className="ml-auto">→ <span className="text-slate-200 font-medium">{sectionName}</span></span>
          </div>

          {unnamed > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {unnamed} item{unnamed !== 1 ? 's' : ''} need a name before they can be imported.
            </div>
          )}

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {reviewItems.map((item, idx) => (
              <div
                key={item.barcode}
                className={`rounded-lg border p-3 space-y-2 transition-opacity ${item.skip ? 'opacity-40' : ''} ${!item.found ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-700 bg-surface-raised'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 ${item.found ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {item.found ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  </span>
                  <span className="font-mono text-[11px] text-slate-600 shrink-0 w-24">{item.barcode}</span>
                  {item.aiParsed && (
                    <span className="text-[10px] text-violet-400 flex items-center gap-0.5 shrink-0">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                  <button
                    onClick={() => updateReviewItem(item.barcode, { skip: !item.skip })}
                    className={`ml-auto shrink-0 px-2 py-0.5 text-[11px] rounded border transition-colors ${
                      item.skip ? 'border-slate-600 text-slate-500 hover:text-accent hover:border-accent/50' : 'border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-500/50'
                    }`}
                  >
                    {item.skip ? 'Include' : 'Skip'}
                  </button>
                </div>

                {!item.skip && (
                  <div className="space-y-1.5 pl-6">
                    {/* Generic name */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-slate-500 w-14 shrink-0">Item</label>
                      <input
                        value={item.generic_name}
                        onChange={e => updateReviewItem(item.barcode, { generic_name: e.target.value })}
                        placeholder="e.g. Beef Hot Dog"
                        disabled={item.skip}
                        className={`flex-1 px-2 py-1 bg-surface border rounded text-sm text-slate-100 focus:outline-none focus:border-accent ${
                          !item.generic_name.trim() ? 'border-amber-500/60 placeholder-amber-500/50' : 'border-slate-600 placeholder-slate-600'
                        }`}
                      />
                      <button
                        onClick={() => handleReparse(idx)}
                        disabled={reParsingIdx === idx}
                        title="Re-parse with AI"
                        className="shrink-0 p-1.5 rounded border border-slate-600 text-slate-500 hover:text-violet-400 hover:border-violet-500/50 disabled:opacity-40"
                      >
                        {reParsingIdx === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      </button>
                    </div>
                    {/* Brand */}
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] text-slate-500 w-14 shrink-0">Brand</label>
                      <input
                        value={item.brand}
                        onChange={e => updateReviewItem(item.barcode, { brand: e.target.value })}
                        placeholder="optional"
                        className="flex-1 px-2 py-1 bg-surface border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:border-accent placeholder-slate-700"
                      />
                    </div>
                    {/* Qty + Unit */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-slate-500 w-14 shrink-0">Qty</label>
                        <input
                          type="number" min={0} value={item.qty}
                          onChange={e => updateReviewItem(item.barcode, { qty: Number(e.target.value) })}
                          className="w-16 px-2 py-1 bg-surface border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-slate-500 shrink-0">Unit</label>
                        <input
                          value={item.unit}
                          onChange={e => updateReviewItem(item.barcode, { unit: e.target.value })}
                          placeholder="optional"
                          className="w-20 px-2 py-1 bg-surface border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-accent placeholder-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between gap-2 pt-1">
            <button onClick={() => setStep('scan')} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">← Back</button>
            <div className="flex gap-2">
              <button onClick={handleClose} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
              <button
                onClick={handleImport}
                disabled={importable === 0 || importing}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-40"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {importing ? 'Importing…' : `Import ${importable}${skipped > 0 ? ` (skip ${skipped})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DONE STEP ── */}
      {step === 'done' && (
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-100 font-medium">{importedCount} item{importedCount !== 1 ? 's' : ''} imported</p>
            <p className="text-sm text-slate-400 mt-1">Added to <span className="text-slate-200">{sectionName}</span></p>
          </div>
          <button onClick={handleClose} className="mt-2 px-5 py-2 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg">Done</button>
        </div>
      )}
    </Modal>
  );
}
