export const EXPIRES_SOON_DAYS = 5;

/**
 * Formats a Date object as local "YYYY-MM-DD".
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses a "YYYY-MM-DD" string into a local Date object at midnight.
 * Avoids UTC off-by-one timezone shifts caused by `new Date("YYYY-MM-DD")`.
 */
export const parseFormattedDate = (dateStr?: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date();
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Returns the number of days until expiration (negative if expired, 0 if today).
 */
export const getExpirationDays = (expirationDateStr?: string): number | null => {
  if (!expirationDateStr || !expirationDateStr.trim()) return null;
  const parts = expirationDateStr.split('-');
  if (parts.length !== 3) return null;

  const expDate = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
  if (isNaN(expDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export const getExpirationColor = (days: number): string => {
  if (days <= 0) return '#FF6B6B';
  if (days <= EXPIRES_SOON_DAYS) return '#FFD700';
  return '#4CAF50';
};

export const getExpirationText = (days: number): string => {
  if (days < 0) {
    const absDays = Math.abs(days);
    return `Expired ${absDays} day${absDays === 1 ? '' : 's'} ago`;
  }
  if (days === 0) return 'Expires today';
  if (days === 1) return 'In 1 day';
  return `In ${days} days`;
};
