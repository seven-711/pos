/**
 * Generates a local ISO timestamp for database synchronization.
 * This ensures the "Database Time" aligns precisely with the user's wall clock (Asia/Manila).
 */
export const getLocalTimestamp = () => {
  const now = new Date();
  // Adjust for the +08:00 offset by adding 8 hours (in milliseconds)
  // and stripping the 'Z' to prevent automatic UTC conversion by the database driver
  const localDate = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return localDate.toISOString().replace('Z', '');
};

/**
 * Formats a timestamp into a high-fidelity business string.
 */
export const formatLocalTime = (isoString: string) => {
  return new Date(isoString).toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};
