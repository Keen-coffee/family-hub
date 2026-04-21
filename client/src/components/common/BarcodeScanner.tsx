import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { X, Camera, Loader2 } from 'lucide-react';

interface Props {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const calledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, err) => {
            if (cancelled) return;
            if (result && !calledRef.current) {
              calledRef.current = true;
              controls.stop();
              onScan(result.getText());
            }
          },
        );
        if (!cancelled) {
          controlsRef.current = controls;
          setStatus('scanning');
        } else {
          controls.stop();
        }
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg(
            e?.message?.includes('Permission')
              ? 'Camera permission denied. Please allow camera access and try again.'
              : 'Could not start camera.',
          );
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-slate-700 rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-slate-200">Scan Barcode</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-raised text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative bg-black aspect-[4/3] overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          {/* Scanning overlay */}
          {status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-32">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-accent rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-accent rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-accent rounded-br" />
                {/* Scan line animation */}
                <div className="absolute left-1 right-1 h-0.5 bg-accent/70 animate-[scan_2s_ease-in-out_infinite]" style={{ top: '50%' }} />
              </div>
            </div>
          )}
          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-xs text-slate-400">Starting camera…</p>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
              <Camera className="w-10 h-10 text-slate-600" />
              <p className="text-xs text-slate-400 text-center">{errorMsg}</p>
            </div>
          )}
        </div>

        <p className="px-4 py-3 text-xs text-slate-500 text-center">
          Point camera at a product barcode — it will be detected automatically
        </p>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 15%; }
          50% { top: 80%; }
        }
      `}</style>
    </div>
  );
}
