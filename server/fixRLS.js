const { supabase } = require('./config/supabase');

async function fixRLS() {
    const query = `
        DROP POLICY IF EXISTS "Providers can update own details" ON providers;
        DROP POLICY IF EXISTS "Allow any UPDATE on providers" ON providers;
        CREATE POLICY "Allow any UPDATE on providers" ON providers FOR UPDATE USING (true);
    `;
    const res = await supabase.rpc('invoke_ddl', { query });
    console.log(res);
}

fixRLS();
