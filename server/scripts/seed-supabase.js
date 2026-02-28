require('dotenv').config();
const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedSupabase() {
    console.log('🌱 Seeding Supabase database with test credentials...');

    try {
        const adminHash = await bcrypt.hash('Admin@123', 10);
        const providerHash = await bcrypt.hash('Provider@123', 10);
        const customerHash = await bcrypt.hash('Customer@123', 10);

        const adminId = uuidv4();
        const providerId = uuidv4();
        const customerId = uuidv4();

        const profiles = [
            { id: adminId, first_name: 'Super', last_name: 'Admin', email: 'admin@trichyfix.com', phone: '+919000000001', password: adminHash, role: 'admin', area: 'Trichy', phone_verified: true },
            { id: providerId, first_name: 'Sample', last_name: 'Provider', email: 'provider@trichyfix.com', phone: '+919876543210', password: providerHash, role: 'provider', area: 'KK Nagar', phone_verified: true },
            { id: customerId, first_name: 'Sample', last_name: 'Customer', email: 'customer@trichyfix.com', phone: '+919000010001', password: customerHash, role: 'customer', area: 'KK Nagar', phone_verified: true }
        ];

        let hasFkError = false;

        for (const profile of profiles) {
            const { error } = await supabase.from('profiles').insert(profile);
            if (error) {
                if (error.code === '23503') { // Foreign Key Violation
                    hasFkError = true;
                    break;
                } else if (error.code === '23505') { // Unique Violation (Already exists)
                    console.log(`⚠️ User ${profile.email} already exists. Skipping.`);
                } else {
                    console.error(`❌ Error inserting ${profile.email}:`, error.message);
                }
            } else {
                console.log(`✅ Created [${profile.role}] account: ${profile.email}`);
            }
        }

        if (hasFkError) {
            console.log('\n❌ FATAL ERROR: Foreign Key Constraint Violation ❌');
            console.log('The "profiles" table is trying to link to "auth.users", which blocking manual user creation.');
            console.log('\n--- ACTION REQUIRED ---');
            console.log('1. Go to your Supabase Dashboard -> SQL Editor');
            console.log('2. Run this exact command to fix the schema:');
            console.log('\n    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;\n');
            console.log('3. After running it, run this script again:\n    node server/scripts/seed-supabase.js\n');
            return;
        }

        // Insert Provider Details
        const { error: pErr } = await supabase.from('providers').insert({
            id: providerId, business_name: 'Sample Electricals', category: 'Electrician', experience: 5, verified: true, rating: 4.8, reviews_count: 10, base_price: 200, price_unit: '/hr', emergency_available: true, is_available: true, status: 'active', skills: ['Wiring', 'Lighting'], areas_served: ['KK Nagar']
        });

        if (pErr && pErr.code !== '23505') {
            console.error('❌ Error inserting provider details:', pErr.message);
        } else if (!pErr) {
            console.log('✅ Created provider business details.');
        }

        console.log('\n🎉 Seeding successful! Use the credentials below to test the app:');
        console.log('------------------------------------------------------------');
        console.log(' ROLE      | EMAIL                    | PASSWORD');
        console.log('------------------------------------------------------------');
        console.log(' Admin     | admin@trichyfix.com      | Admin@123');
        console.log(' Provider  | provider@trichyfix.com   | Provider@123');
        console.log(' Customer  | customer@trichyfix.com   | Customer@123');
        console.log('------------------------------------------------------------\n');

    } catch (err) {
        console.error('Script failed:', err.message);
    }
}

seedSupabase();
