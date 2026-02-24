import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // 1. Try inserting email for bogus contact ID
    console.log("Checking DB constraints...");
    const { data, error } = await supabase.from('contact_emails').insert({
        contact_id: '12345678-1234-1234-1234-123456789012',
        user_id: '12345678-1234-1234-1234-123456789012',
        graph_message_id: 'test_graph_id_12345_check_fk',
        conversation_id: 'test_conv_id_12345',
        direction: 'outbound',
        subject: 'Test Diagnostic Email',
        body_html: 'Test',
        sender_address: 'test@example.com',
        recipients: ['test2@example.com'],
        timestamp: new Date().toISOString()
    });

    console.log("Insert response:");
    console.log(error || data);
}

check();
