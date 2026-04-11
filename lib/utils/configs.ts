import { supabase } from "@/lib/supabase";

/**
 * Global configuration utility for store-wide settings.
 * Persists data in the 'store_configs' table with LocalStorage fallback.
 */
export const getStoreConfig = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const { data, error } = await supabase
      .from("store_configs")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    // If we have a DB value, use it
    if (!error && data?.value !== undefined && data?.value !== null) {
      // Also sync to local storage for offline use
      localStorage.setItem(`config_${key}`, JSON.stringify(data.value));
      return data.value;
    }

    // Otherwise, check LocalStorage
    const local = localStorage.getItem(`config_${key}`);
    return local ? JSON.parse(local) : defaultValue;
  } catch (err) {
    const local = localStorage.getItem(`config_${key}`);
    return local ? JSON.parse(local) : defaultValue;
  }
};

export const updateStoreConfig = async <T>(key: string, value: T): Promise<boolean> => {
  // Always update local first for immediate reliability
  try {
    localStorage.setItem(`config_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error("Local storage update failed", e);
  }

  try {
    const { error } = await supabase
      .from("store_configs")
      .upsert({ key, value }, { onConflict: "key" });

    if (error) {
      console.warn(`Supabase Config Sync Failed [${key}]:`, error.message);
      // We don't return false here because local storage succeeded
      return true; 
    }

    return true;
  } catch (err) {
    console.error(`Unexpected Config Sync Error [${key}]:`, err);
    return true;
  }
};
