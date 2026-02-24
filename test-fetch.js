import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function run() {
    try {
        const res = await fetch(`${supabaseUrl}/functions/v1/run-sql`, {
            headers: {
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
