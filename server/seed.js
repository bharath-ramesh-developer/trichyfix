require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function wipeAndSeed() {
    console.log('1. Wiping all data from profiles (Cascading to Providers and Bookings)...');

    // Delete all existing profiles. (Using a dummy filter that captures everything)
    const { error: delErr } = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) {
        console.error('[ERROR] Failed to drop data:', delErr.message);
        return;
    }
    console.log('✅ All old ghost accounts, providers, and data completely scrubbed!');

    console.log('2. Generating securely hashed passwords for fresh seed accounts...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const adminId = uuidv4();
    const providerId = uuidv4();
    const customerId = uuidv4();

    const profiles = [
        {
            id: adminId,
            first_name: 'Sys',
            last_name: 'Admin',
            phone: '+91 9999999990',
            password: passwordHash,
            role: 'admin',
            phone_verified: true,
            area: 'Head Office'
        },
        {
            id: providerId,
            first_name: 'Pro',
            last_name: 'Electrician',
            phone: '+91 8888888880',
            password: passwordHash,
            role: 'provider',
            phone_verified: true,
            area: 'Thillai Nagar'
        },
        {
            id: customerId,
            first_name: 'Test',
            last_name: 'Customer',
            phone: '+91 7777777770',
            password: passwordHash,
            role: 'customer',
            phone_verified: true,
            area: 'KK Nagar'
        }
    ];

    console.log('3. Injecting 3 cleanly formatted master roles...');
    const { error: insErr } = await supabase.from('profiles').insert(profiles);
    if (insErr) {
        console.error('[ERROR] Failed to seed profiles:', insErr.message);
        return;
    }
    console.log('✅ Admin, Provider, and Customer profiles actively seated.');

    console.log('4. Connecting Provider secondary specifics...');
    const providerDetails = {
        id: providerId,
        business_name: 'Trichy Fast Fixers',
        category: 'Electrician',
        experience: 5,
        verified: true,
        base_price: 150,
        emergency_available: true,
        description: 'Fully certified top-rated technician ready to resolve your electrical faults natively.',
        rating: 4.9,
        reviews_count: 12
    };

    const { error: provErr } = await supabase.from('providers').insert(providerDetails);
    if (provErr) {
        console.error('[ERROR] Provider Details drop:', provErr.message);
    } else {
        console.log('✅ Provider successfully linked to internal marketplace directory.');
    }

    console.log('\n=======================================');
    console.log('🔥 DATABASE RESET AND SEED COMPLETE! 🔥');
    console.log('=======================================');
    console.log('ADMIN LOGIN    : Mobile: +91 9999999990 | Pass: password123');
    console.log('PROVIDER LOGIN : Mobile: +91 8888888880 | Pass: password123');
    console.log('CUSTOMER LOGIN : Mobile: +91 7777777770 | Pass: password123');
    console.log('=======================================');
}

wipeAndSeed();
