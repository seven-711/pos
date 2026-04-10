/**
 * Generates an offset-aware local ISO timestamp for database synchronization.
 * This ensures the database knows the record was created in the Asia/Manila (+08:00) 
 * timezone, preventing 'future-dating' while still aligning with your wall clock.
 */
export const getLocalTimestamp = () => {
  const now = new Date();
  const pad = (n: number) => n < 10 ? '0' + n : n;
  
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  
  // Returns e.g., 2026-04-10T17:05:00+08:00
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
};

/**
 * Formats a timestamp into a high-fidelity business string, 
 * ensuring it respects the correct timezone offset.
 */
export const formatLocalTime = (isoString: string) => {
  if (!isoString) return "--:--";
  
  // Ensure the string has an offset if it represents a local DB time
  const dateStr = isoString.includes('T') && !isoString.includes('+') && !isoString.endsWith('Z')
    ? `${isoString}+08:00`
    : isoString;
    
  return new Date(dateStr).toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};
