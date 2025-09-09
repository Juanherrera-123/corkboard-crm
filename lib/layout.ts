import type { Layout } from 'react-grid-layout';

export const gridCols = 10;

export const DEFAULT_W = 4;
export const DEFAULT_H = 3;

export const minW = 2;
export const maxW = gridCols;
export const minH = 2;
export const maxH = 8;

// Normalize layout items by sorting them visually (top-to-bottom, left-to-right)
// and reassigning `x`/`y` coordinates to remove gaps and overlaps. The algorithm
// greedily places each item in the first available spot scanning rows
// left-to-right.

export const normalizeLayout = (items: Layout[], cols: number): Layout[] => {
  const sorted = items.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const occupied: boolean[][] = [];

  const canPlace = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (occupied[yy]?.[xx]) return false;
      }
    }
    return true;
  };

  const occupy = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy++) {
      if (!occupied[yy]) occupied[yy] = [];
      for (let xx = x; xx < x + w; xx++) {
        occupied[yy][xx] = true;
      }
    }
  };

  return sorted.map((item) => {
    const w = item.w ?? 1;
    const h = item.h ?? 1;
    let x = 0;
    let y = 0;
    while (true) {
      if (x + w > cols) {
        x = 0;
        y += 1;
        continue;
      }
      if (canPlace(x, y, w, h)) {
        occupy(x, y, w, h);
        return { ...item, x, y };
      }
      x += 1;
    }
  });
};
