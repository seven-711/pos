const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let envData = '';
try {
  envData = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
} catch (e) {
  console.log('.env.local not found');
}

const env = {};
envData.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogColumns() {
  console.log('--- Checking inventory_logs Columns ---');
  try {
    const { data: logData, error: logError } = await supabase.from('inventory_logs').select('*').limit(1);
    if (logError) throw logError;
    if (logData && logData.length > 0) {
      console.log('inventory_logs columns:', Object.keys(logData[0]));
    } else {
      console.log('No logs found to determine columns.');
    }
  } catch (e) {
    console.log('Error checking inventory_logs:', e.message);
  }
}

checkLogColumns();
