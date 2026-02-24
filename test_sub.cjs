const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

// We need a way to get the admin client. 
// Can we use a token or just hardcode checking the subscription endpoint?
// I will just mock the Microsoft request.
