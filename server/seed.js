require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function wipeAndSeed() {
    console.log('1. Wiping all data from database tables...');
    
    // 1a. Delete bookings first (Bottom of the chain)
    await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // 1b. Delete providers
    await supabase.from('providers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // 1c. Delete profiles
    const { error: delErr } = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (delErr) {
        console.error('[ERROR] Failed to drop data:', delErr.message);
        return;
    }
    console.log('✅ All old data (bookings, providers, profiles) completely scrubbed!');

    console.log('2. Generating securely hashed passwords for fresh seed accounts...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const targetPhones = [
        '+91 9999999990', '+91 8888888880', '+91 7777777770',
        '+91 8888888881', '+91 8888888882', '+91 8888888883',
        '+91 8888888884', '+91 8888888885', '+91 8888888886',
        '+91 8888888887', '+91 8888888888', '+91 8888888889',
        '+91 8888888890', '+91 8888888891', '+91 8888888892',
        '+91 8888888893'
    ];
    
    // Fetch existing so we don't duplicate unique fields
    const { data: existingProfiles } = await supabase.from('profiles').select('id, phone').in('phone', targetPhones);
    const profileMap = {};
    if (existingProfiles) {
        existingProfiles.forEach(p => profileMap[p.phone] = p.id);
    }

    const adminId = profileMap['+91 9999999990'] || uuidv4();
    const customerId = profileMap['+91 7777777770'] || uuidv4();

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

    const providerList = [
        { first_name: 'Pro', last_name: 'Electrician', phone: '+91 8888888880', area: 'Thillai Nagar', business_name: 'Trichy Fast Fixers', category: 'Electrician', experience: 5, base_price: 150, emergency_available: true, description: 'Fully certified top-rated technician ready to resolve your electrical faults natively.' },
        { first_name: 'Spark', last_name: 'Tech', phone: '+91 8888888881', area: 'Cantonment', business_name: 'Spark Fast Electricals', category: 'Electrician', experience: 8, base_price: 200, emergency_available: false, description: 'Quick spark fixes and electrical wiring.' },
        
        { first_name: 'Mani', last_name: 'Plumbing', phone: '+91 8888888882', area: 'Srirangam', business_name: 'Pipe Masters', category: 'Plumber', experience: 10, base_price: 100, emergency_available: true, description: 'Leak masters and pipe fitting experts.' },
        { first_name: 'Velu', last_name: 'P', phone: '+91 8888888883', area: 'Woraiyur', business_name: 'Quick Flow Plumbing', category: 'Plumber', experience: 3, base_price: 120, emergency_available: false, description: 'Quick flow and clean pipes.' },
        
        { first_name: 'Senthil', last_name: 'AC', phone: '+91 8888888884', area: 'Tennur', business_name: 'Cool Breeze AC', category: 'AC Repair', experience: 6, base_price: 250, emergency_available: true, description: 'Cool AC repair and regular services.' },
        { first_name: 'Karthi', last_name: 'Tech', phone: '+91 8888888885', area: 'K K Nagar', business_name: 'Chill Tech', category: 'AC Repair', experience: 4, base_price: 300, emergency_available: false, description: 'All brands AC installation and repair.' },
        
        { first_name: 'Ragu', last_name: 'Wood', phone: '+91 8888888886', area: 'Palakkarai', business_name: 'Wood Works', category: 'Carpentry', experience: 12, base_price: 180, emergency_available: false, description: 'Furniture building and repairs.' },
        { first_name: 'Arun', last_name: 'Carpenter', phone: '+91 8888888887', area: 'Edamalaipatti Pudur', business_name: 'Fine Build', category: 'Carpentry', experience: 7, base_price: 150, emergency_available: true, description: 'Wooden magic for home and office.' },
        
        { first_name: 'Devi', last_name: 'Clean', phone: '+91 8888888888', area: 'Thiruverumbur', business_name: 'Sparkle Clean', category: 'Appliance', experience: 2, base_price: 500, emergency_available: false, description: 'Deep house cleaning and dusting.' },
        { first_name: 'Meena', last_name: 'Homes', phone: '+91 8888888889', area: 'K K Nagar', business_name: 'Fresh Homes', category: 'Appliance', experience: 5, base_price: 600, emergency_available: true, description: 'Fresh home spaces with sanitization.' },
        
        { first_name: 'Raj', last_name: 'Painters', phone: '+91 8888888890', area: 'Srirangam', business_name: 'Color Splash', category: 'Painting', experience: 9, base_price: 400, emergency_available: false, description: 'Painting works inside and out.' },
        { first_name: 'Hari', last_name: 'Coats', phone: '+91 8888888891', area: 'Thillai Nagar', business_name: 'Dream Coats', category: 'Painting', experience: 15, base_price: 450, emergency_available: true, description: 'Premium wall paints and texture.' },
        
        { first_name: 'Ramesh', last_name: 'Driver', phone: '+91 8888888892', area: 'K K Nagar', business_name: 'Safe Drive Trichy', category: 'Acting Driver', experience: 12, base_price: 500, emergency_available: true, description: 'Expert driver for all luxury and manual cars. Available for long trips.' },
        { first_name: 'Suresh', last_name: 'Acting', phone: '+91 8888888893', area: 'Srirangam', business_name: 'Trichy Valet Services', category: 'Acting Driver', experience: 7, base_price: 400, emergency_available: false, description: 'Reliable city driver for daily commutes and errands.' }
    ];

    const providerDetails = [];

    for (const p of providerList) {
        const pId = profileMap[p.phone] || uuidv4();
        profiles.push({
            id: pId,
            first_name: p.first_name,
            last_name: p.last_name,
            phone: p.phone,
            password: passwordHash,
            role: 'provider',
            phone_verified: true,
            area: p.area
        });
        providerDetails.push({
            id: pId,
            business_name: p.business_name,
            category: p.category,
            experience: p.experience,
            verified: true,
            status: 'active',
            base_price: p.base_price,
            emergency_available: p.emergency_available,
            description: p.description,
            rating: parseFloat((Math.random() * (5.0 - 4.0) + 4.0).toFixed(1)),
            reviews_count: Math.floor(Math.random() * 50) + 5
        });
    }

    const profilesToInsert = profiles.filter(p => !profileMap[p.phone]);
    const newProfileIds = new Set(profilesToInsert.map(p => p.id));
    const providerDetailsToInsert = providerDetails.filter(p => newProfileIds.has(p.id));

    console.log(`3. Injecting ${profilesToInsert.length} cleanly formatted master roles and providers...`);
    if (profilesToInsert.length > 0) {
        const { error: insErr } = await supabase.from('profiles').insert(profilesToInsert);
        if (insErr) {
            console.error('[ERROR] Failed to seed profiles:', insErr.message);
            return;
        }
        console.log('✅ Master and Providers profiles actively seated.');
    } else {
        console.log('✅ All master profiles are already present.');
    }

    console.log(`4. Connecting ${providerDetailsToInsert.length} Provider secondary specifics...`);
    if (providerDetailsToInsert.length > 0) {
        const { error: provErr } = await supabase.from('providers').insert(providerDetailsToInsert);
        if (provErr) {
            console.error('[ERROR] Provider Details drop:', provErr.message);
        } else {
            console.log('✅ All Providers successfully linked to internal marketplace directory.');
        }
    } else {
        console.log('✅ All Providers are already properly linked.');
    }

    console.log('\n=======================================');
    console.log('🔥 DATABASE RESET AND SEED COMPLETE! 🔥');
    console.log('=======================================');
    console.log('ADMIN LOGIN    : Mobile: +91 9999999990 | Pass: password123');
    console.log('CUSTOMER LOGIN : Mobile: +91 7777777770 | Pass: password123');
    console.log('=======================================');
    console.log('TEST PROVIDERS (Password is password123 for all):');
    for (const p of providerList) {
        console.log(`${p.category.padEnd(12)} : Mobile: ${p.phone} | ${p.business_name}`);
    }
    console.log('=======================================');
}

wipeAndSeed();
