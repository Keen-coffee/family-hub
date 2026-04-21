import React, { useCallback } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { WidgetConfig } from '../../types';
import WidgetWrapper from './WidgetWrapper';
import { useContainerWidth } from '../../hooks/useContainerWidth';

// Heights (in rows * rowHeight px) to use when stacking on mobile
const MOBILE_HEIGHTS: Record<string, number> = {
  clock: 80, weather: 200, calendar: 320, meals: 200, tasks: 260, grocery: 200, chores: 200,
};

export default function DashboardGrid() {
  const { layout, setLayout, isEditing } = useDashboardStore();
  const { ref, width } = useContainerWidth();

  const isMobile = width > 0 && width < 640;

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      const merged: WidgetConfig[] = layout.map(w => {
        const updated = newLayout.find(l => l.i === w.i);
        if (!updated) return w;
        return { ...w, x: updated.x, y: updated.y, w: updated.w, h: updated.h };
      });
      setLayout(merged);
    },
    [layout, setLayout]
  );

  const gridLayout: Layout[] = layout.map(w => ({
    i: w.i,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: w.minW,
    minH: w.minH,
    maxW: w.maxW,
    maxH: w.maxH,
    static: !isEditing || w.static,
    isDraggable: isEditing,
    isResizable: isEditing,
  }));

  if (isMobile) {
    return (
      <div ref={ref} className="w-full h-full overflow-auto p-3 space-y-3 pb-20">
        {layout.map(widget => (
          <div
            key={widget.i}
            style={{ height: MOBILE_HEIGHTS[widget.type] ?? 200 }}
            className="w-full overflow-hidden rounded-xl"
          >
            <WidgetWrapper config={widget} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="w-full h-full overflow-auto">
      <GridLayout
        layout={gridLayout}
        cols={48}
        rowHeight={28}
        width={width}
        margin={[6, 6]}
        containerPadding={[12, 12]}
        onLayoutChange={handleLayoutChange}
        isDraggable={isEditing}
        isResizable={isEditing}
        resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 's', 'n']}
        draggableHandle=".widget-drag-handle"
        className="min-h-full"
      >
        {layout.map(widget => (
          <div key={widget.i} className="overflow-hidden">
            <WidgetWrapper config={widget} />
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
