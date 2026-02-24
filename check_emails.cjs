const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmails() {
    const { data, error } = await supabase.from('contact_emails').select('id, contact_id, subject, direction');
    if (error) console.error(error);
    console.log('Emails in DB:', data);
}

checkEmails();
