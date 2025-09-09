declare module 'react-grid-layout' {
  import * as React from 'react';

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
  }

  export interface ReactGridLayoutProps {
    className?: string;
    style?: React.CSSProperties;
    layout: Layout[];
    cols?: number;
    rowHeight?: number;
    width?: number;
    margin?: [number, number];
    isDraggable?: boolean;
    isResizable?: boolean;
    compactType?: 'vertical' | 'horizontal' | null;
    onLayoutChange?: (layout: Layout[]) => void;
    draggableHandle?: string;
    [key: string]: any;
  }

  export default class ReactGridLayout extends React.Component<ReactGridLayoutProps> {}
  export function WidthProvider<P>(component: React.ComponentType<P>): React.ComponentClass<P>;
  export type { Layout as LayoutItem };
}
