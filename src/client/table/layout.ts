export interface Rect { x: number; y: number; width: number; height: number }
export interface TableLayout {
  header: Rect;
  opponent: Rect;
  field: Rect;
  current: Rect;
  hand: Rect;
  choices: Rect;
  progress: Rect;
  stack: Rect;
  rows: Record<'opponentBackups' | 'opponentForwards' | 'yourForwards' | 'yourBackups', Rect>;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Viewport geometry for the table and its controls. */
export function computeTableLayout(width: number, height: number): TableLayout {
  const viewportWidth = Math.max(0, width);
  const viewportHeight = Math.max(0, height);
  const headerHeight = Math.min(58, viewportHeight);
  const footerHeight = Math.min(viewportHeight - headerHeight, clamp(viewportHeight * 0.145, 124, 156));
  const tableHeight = Math.max(0, viewportHeight - headerHeight - footerHeight);
  const opponentHeight = Math.min(tableHeight, clamp(tableHeight * 0.13, 72, 100));
  const currentHeight = Math.min(Math.max(0, tableHeight - opponentHeight), clamp(tableHeight * 0.22, 164, 180));
  const fieldHeight = Math.max(0, tableHeight - opponentHeight - currentHeight);
  const header = { x: 0, y: 0, width: viewportWidth, height: headerHeight };
  const opponent = { x: 0, y: header.y + header.height, width: viewportWidth, height: opponentHeight };
  const field = { x: 0, y: opponent.y + opponent.height, width: viewportWidth, height: fieldHeight };
  const current = { x: 0, y: field.y + field.height, width: viewportWidth, height: currentHeight };
  const progressHeight = footerHeight;
  const progress = { x: viewportWidth * 0.55, y: viewportHeight - footerHeight,
    width: viewportWidth - viewportWidth * 0.55, height: progressHeight };
  const choices = { x: 0, y: progress.y, width: viewportWidth - progress.width, height: progressHeight };
  const handHeight = currentHeight;
  const hand = { x: viewportWidth * (viewportWidth < 1600 ? 0.27 : 0.22), y: current.y + current.height - handHeight,
    width: viewportWidth * 0.66, height: handHeight };
  const inset = Math.min(16, viewportWidth / 2);
  const railWidth = Math.min(208, Math.max(0, viewportWidth - inset * 2));
  const stack = { x: viewportWidth - inset - railWidth, y: field.y + field.height * 0.2,
    width: railWidth, height: field.height * 0.6 };
  const fieldTopInset = Math.min(field.height, 26);
  const fieldBottomInset = Math.min(field.height - fieldTopInset, 8);
  const rowHeight = Math.max(0, (field.height - fieldTopInset - fieldBottomInset) / 4);
  const rowWidth = Math.max(0, stack.x - inset - 12);
  const makeRow = (index: number): Rect => ({ x: inset, y: field.y + fieldTopInset + rowHeight * index,
    width: rowWidth, height: rowHeight });
  const rows = {
    opponentBackups: makeRow(0), opponentForwards: makeRow(1),
    yourForwards: makeRow(2), yourBackups: makeRow(3),
  };
  return { header, opponent, field, current, hand, choices, progress, stack, rows };
}
