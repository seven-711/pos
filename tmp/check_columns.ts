import { supabase } from './lib/supabase';

async function checkColumns() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
  }
}

checkColumns();
