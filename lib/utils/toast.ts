export const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('global-toast', { 
      detail: { msg, type } 
    }));
  }
};
