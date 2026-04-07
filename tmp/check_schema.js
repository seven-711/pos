const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching product:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Product columns:', Object.keys(data[0]));
  } else {
    console.log('No products found, checking table columns via RPC or assumption.');
  }
}

checkSchema();
