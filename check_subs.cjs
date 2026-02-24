const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubs() {
    const { data: connections } = await supabase.from('user_oauth_connections').select('*');
    if (!connections || connections.length === 0) {
        console.log('No user connections found.');
        return;
    }

    for (const conn of connections) {
        console.log(`\nChecking subscriptions for ${conn.microsoft_email}...`);
        const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
            headers: { 'Authorization': `Bearer ${conn.access_token}` }
        });
        if (res.status === 401) {
            console.log(`Token expired for ${conn.microsoft_email}.`);
            continue;
        }
        const data = await res.json();
        console.log(`Found ${data.value?.length || 0} active subscriptions:`);
        data.value?.forEach(sub => {
            console.log(` - Resource: ${sub.resource}`);
            console.log(`   Webhook: ${sub.notificationUrl}`);
            console.log(`   Expires: ${sub.expirationDateTime}`);
        });
    }
}

checkSubs();
