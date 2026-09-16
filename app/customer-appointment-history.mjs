export const customerHistoryPageSize = 20;

export function customerHistoryStartsAt(now = new Date()) {
  const startsAt = new Date(now);
  startsAt.setFullYear(startsAt.getFullYear() - 1);
  return startsAt.toISOString();
}
