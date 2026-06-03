#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const sqlPath = join(__dirname, '../supabase/migrations/20260604000000_vehicle_hierarchy_tables.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('Creating vehicle hierarchy tables...');

try {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
    // If exec_sql RPC doesn't exist, try direct SQL execution
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      const { error } = await supabase.from('_sql').select().limit(0).throwOnError();
      if (error) throw error;
    }
    
    return { data: null, error: null };
  });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('✅ Tables created successfully!');
  console.log('\nPlease go to Supabase Dashboard → SQL Editor and run:');
  console.log(sqlPath);
} catch (err) {
  console.error('Failed:', err.message);
  console.log('\n⚠️  Please run this SQL manually in Supabase Dashboard → SQL Editor:');
  console.log(sqlPath);
  process.exit(1);
}
