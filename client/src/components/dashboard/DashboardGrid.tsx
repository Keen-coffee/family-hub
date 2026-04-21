import React, { useCallback } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { WidgetConfig } from '../../types';
import WidgetWrapper from './WidgetWrapper';
import { useContainerWidth } from '../../hooks/useContainerWidth';

export default function DashboardGrid() {
  const { layout, setLayout, isEditing } = useDashboardStore();
  const { ref, width } = useContainerWidth();

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
