import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(28);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      // ~10% of container width, clamped between 16px and 64px
      setFontSize(Math.min(Math.max(Math.round(width * 0.10), 16), 64));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full flex flex-col items-center justify-center px-2 py-1 select-none overflow-hidden">
      <div
        className="whitespace-nowrap font-mono font-semibold text-slate-100 tabular-nums leading-none"
        style={{ fontSize }}
      >
        {format(now, 'h:mm')}
        <span style={{ fontSize: fontSize * 0.6 }} className="text-accent ml-1.5">{format(now, 'a')}</span>
      </div>
      <div
        className="mt-1 whitespace-nowrap text-slate-400 font-medium tracking-wide"
        style={{ fontSize: Math.max(Math.round(fontSize * 0.38), 10) }}
      >
        {format(now, 'EEEE, MMMM d')}
      </div>
    </div>
  );
}
