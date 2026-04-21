import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { Camera, CameraOff, X } from 'lucide-react';

interface ScanResult {
  barcode: string;
}

interface Props {
  onScan: (result: ScanResult) => void;
  onClose?: () => void;
  active?: boolean;
}

export default function BarcodeScanner({ onScan, onClose, active = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const startScanning = useCallback(async () => {
    if (!videoRef.current || !active) return;
    setError(null);

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 300 });
    readerRef.current = reader;

    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      // Prefer back camera
      const backCam = devices.find(d =>
        d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment')
      );
      const deviceId = backCam?.deviceId ?? devices[devices.length - 1]?.deviceId;

      const controls = await reader.decodeFromVideoDevice(
        deviceId ?? undefined,
        videoRef.current,
        (result, err) => {
          if (result) {
            onScan({ barcode: result.getText() });
          }
        }
      );
      controlsRef.current = controls;
      setScanning(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access failed');
      setScanning(false);
    }
  }, [active, onScan]);

  const stopScanning = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    if (active) {
      startScanning();
    } else {
      stopScanning();
    }
    return stopScanning;
  }, [active, startScanning, stopScanning]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

      {/* Scan overlay */}
      {scanning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-accent rounded-lg w-3/4 h-1/2 relative">
            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-accent rounded-tl-lg -translate-x-px -translate-y-px" />
            <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-accent rounded-tr-lg translate-x-px -translate-y-px" />
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-accent rounded-bl-lg -translate-x-px translate-y-px" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-accent rounded-br-lg translate-x-px translate-y-px" />
            {/* Scan line animation */}
            <div className="absolute left-2 right-2 h-0.5 bg-accent/70 animate-scan-line" />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90">
          <CameraOff className="w-10 h-10 text-slate-500" />
          <p className="text-xs text-slate-400 text-center px-4">{error}</p>
          <button
            onClick={startScanning}
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Scanning indicator */}
      {scanning && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1 backdrop-blur-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] text-white">Scanning…</span>
        </div>
      )}
    </div>
  );
}
