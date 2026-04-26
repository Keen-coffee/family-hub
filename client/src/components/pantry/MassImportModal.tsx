import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ScanLine, Loader2, CheckCircle, AlertTriangle, ArrowRight, X, Ban } from 'lucide-react';
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
  /** Editable display name shown to user */
  name: string;
  unit: string;
  qty: number;
  found: boolean;
  /** Skip this item during import */
  skip: boolean;
}

type Step = 'scan' | 'looking' | 'review' | 'done';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sections: PantrySection[];
  onImport: (sectionId: string, items: { name: string; quantity: number; unit: string }[]) => Promise<void>;
}

// OpenFoodFacts enforces 15 req/min per IP — space requests ~4.5 s apart.
const OFF_DELAY_MS = 4500;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDisplayName(r: LookupResult): string {
  if (!r.name) return '';
  return r.brand ? `${r.brand} ${r.name}` : r.name;
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
  const [scanned, setScanned] = useState<string[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [lookupProgress, setLookupProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const cancelRef = useRef(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

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
    setScanned([]);
    setBarcodeInput('');
    setReviewItems([]);
    setLookupProgress({ current: 0, total: 0 });
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
        setScanned(prev => prev.includes(val) ? prev : [...prev, val]);
      }
      setBarcodeInput('');
    }
  };

  const removeBarcode = (b: string) => setScanned(prev => prev.filter(x => x !== b));

  // Sequential lookup — one barcode at a time respecting the 15 req/min limit.
  const handleProcess = async () => {
    if (scanned.length === 0) return;
    cancelRef.current = false;
    setLookupProgress({ current: 0, total: scanned.length });
    setStep('looking');

    const results: ReviewItem[] = [];

    for (let i = 0; i < scanned.length; i++) {
      if (cancelRef.current) break;

      const barcode = scanned[i];
      let reviewItem: ReviewItem = { barcode, name: '', unit: '', qty: 1, found: false, skip: false };

      try {
        const r = await fetch(`/api/openfoodfacts/${encodeURIComponent(barcode)}`);
        const data = await r.json() as { success: boolean; data?: LookupResult };
        if (data.success && data.data) {
          const res = data.data;
          reviewItem = {
            barcode,
            name: buildDisplayName(res),
            unit: '',
            qty: 1,
            found: !!res.name,
            skip: false,
          };
        }
      } catch {
        // keep defaults (found: false, name: '')
      }

      results.push(reviewItem);
      setLookupProgress({ current: i + 1, total: scanned.length });

      // Wait between requests — skip the delay after the last item.
      if (i < scanned.length - 1 && !cancelRef.current) {
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
    setLookupProgress({ current: 0, total: 0 });
  };

  const updateReviewItem = (barcode: string, patch: Partial<ReviewItem>) => {
    setReviewItems(prev => prev.map(it => it.barcode === barcode ? { ...it, ...patch } : it));
  };

  const handleImport = async () => {
    const toImport = reviewItems.filter(it => !it.skip && it.name.trim());
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      await onImport(selectedSection, toImport.map(it => ({ name: it.name.trim(), quantity: it.qty, unit: it.unit.trim() })));
      setImportedCount(toImport.length);
      setStep('done');
    } finally {
      setImporting(false);
    }
  };

  const importable = reviewItems.filter(it => !it.skip && it.name.trim()).length;
  const skipped = reviewItems.filter(it => it.skip).length;
  const unnamed = reviewItems.filter(it => !it.skip && !it.name.trim()).length;

  const sectionName = sections.find(s => s.id === selectedSection)?.name ?? '';

  const STEPS: Step[] = ['scan', 'looking', 'review', 'done'];
  const STEP_LABELS: Record<Step, string> = { scan: 'Scan', looking: 'Lookup', review: 'Review', done: 'Done' };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Mass Barcode Import" size="lg">
      {/* Step indicators */}
      <div className="flex items-center gap-1 px-5 pt-4 pb-2">
        {(['scan', 'review', 'done'] as Step[]).map((s, i) => {
          const idx = ['scan', 'review', 'done'].indexOf(step === 'looking' ? 'scan' : step);
          const sIdx = i;
          const active = (step === 'looking' && s === 'scan') || step === s;
          const past = sIdx < idx;
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
          {/* Section picker */}
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

          {/* Barcode input — USB scanners type + Enter */}
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
            <p className="mt-1 text-[11px] text-slate-600">USB barcode readers work automatically — each scan adds to the list below. Press Enter to add a typed barcode.</p>
          </div>

          {/* Scanned list */}
          {scanned.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400">{scanned.length} barcode{scanned.length !== 1 ? 's' : ''} scanned</span>
                <button onClick={() => setScanned([])} className="text-[11px] text-slate-600 hover:text-red-400">Clear all</button>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-0.5 rounded-lg border border-slate-700 bg-surface-raised p-2">
                {scanned.map(b => (
                  <div key={b} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700/50 group">
                    <span className="flex-1 font-mono text-xs text-slate-300">{b}</span>
                    <button onClick={() => removeBarcode(b)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {scanned.length > 1 && (
                <p className="mt-1.5 text-[11px] text-slate-600">
                  Lookup will take ~{Math.round((scanned.length * OFF_DELAY_MS) / 1000)}s (rate-limited to 15 req/min by OpenFoodFacts)
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={handleClose} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button
              onClick={handleProcess}
              disabled={scanned.length === 0 || !selectedSection}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-40"
            >
              <ArrowRight className="w-4 h-4" />
              Process {scanned.length} item{scanned.length !== 1 ? 's' : ''}
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
              Looking up {lookupProgress.current} of {lookupProgress.total}…
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {lookupProgress.current < lookupProgress.total
                ? secsRemaining(lookupProgress.current, lookupProgress.total)
                : 'Finishing up…'}
            </p>
          </div>
          {/* Progress bar */}
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
            <Ban className="w-3.5 h-3.5" /> Cancel lookup
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
            {reviewItems.map(item => (
              <div
                key={item.barcode}
                className={`rounded-lg border p-3 space-y-2 transition-opacity ${item.skip ? 'opacity-40' : ''} ${!item.found ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-700 bg-surface-raised'}`}
              >
                <div className="flex items-start gap-2">
                  {/* Found badge */}
                  <span className={`mt-0.5 shrink-0 ${item.found ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {item.found ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 mt-0.5 shrink-0 w-28">{item.barcode}</span>
                  {/* Name input */}
                  <input
                    value={item.name}
                    onChange={e => updateReviewItem(item.barcode, { name: e.target.value })}
                    placeholder={item.found ? '' : 'Not found — enter name manually'}
                    disabled={item.skip}
                    className={`flex-1 px-2 py-1 bg-surface border rounded text-sm text-slate-100 focus:outline-none focus:border-accent min-w-0 ${
                      !item.name.trim() && !item.skip ? 'border-amber-500/60 placeholder-amber-500/50' : 'border-slate-600 placeholder-slate-600'
                    }`}
                  />
                  {/* Skip toggle */}
                  <button
                    onClick={() => updateReviewItem(item.barcode, { skip: !item.skip })}
                    title={item.skip ? 'Include item' : 'Skip item'}
                    className={`shrink-0 px-2 py-1 text-[11px] rounded border transition-colors ${
                      item.skip
                        ? 'border-slate-600 text-slate-500 hover:border-accent/50 hover:text-accent'
                        : 'border-slate-600 text-slate-400 hover:border-red-500/50 hover:text-red-400'
                    }`}
                  >
                    {item.skip ? 'Include' : 'Skip'}
                  </button>
                </div>
                {/* Qty + Unit */}
                {!item.skip && (
                  <div className="flex items-center gap-2 pl-[4.5rem]">
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-slate-600">Qty</label>
                      <input
                        type="number"
                        min={0}
                        value={item.qty}
                        onChange={e => updateReviewItem(item.barcode, { qty: Number(e.target.value) })}
                        className="w-14 px-2 py-0.5 bg-surface border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-slate-600">Unit</label>
                      <input
                        value={item.unit}
                        onChange={e => updateReviewItem(item.barcode, { unit: e.target.value })}
                        placeholder="optional"
                        className="w-20 px-2 py-0.5 bg-surface border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:border-accent placeholder-slate-700"
                      />
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
                {importing ? 'Importing…' : `Import ${importable} item${importable !== 1 ? 's' : ''}${skipped > 0 ? ` (skip ${skipped})` : ''}`}
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
