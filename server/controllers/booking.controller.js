const { supabase } = require('../config/supabase');

/**
 * Controller: Bookings
 * Manages booking schedules, ratings, logic flows between Users and Providers, 
 * and status updates inside the application.
 */

// ==========================================
// 1. Transactional Booking
// ==========================================

/**
 * @route   POST /api/bookings
 * @desc    Submit a new booking requirement securely linking customer to provider
 * @access  Private (Authenticated users only)
 */
exports.createBooking = async (req, res) => {
    try {
        const { providerId, date, time, description, isEmergency, address } = req.body;
        console.log(`[INFO] New Booking Attempt: Customer ${req.user.id} -> Provider ${providerId}`);

        // 0. Role Check (Extra Security)
        if (req.user.role !== 'customer') {
            console.log(`[WARNING] Booking Rejected: User ${req.user.id} is not a customer (${req.user.role})`);
            return res.status(403).json({ success: false, message: 'Only customers are allowed to book services.' });
        }

        // 1. Validation Hook
        if (!providerId || !date || !time || !description || !address) {
            console.log(`[WARNING] Booking Rejected: Missing required fields`);
            return res.status(400).json({ success: false, message: 'All booking fields, including Detailed Address, are required' });
        }

        if (address.length < 30) {
            console.log(`[WARNING] Booking Rejected: Address failed length parameters`);
            return res.status(400).json({ success: false, message: 'Detailed Address must be a minimum of 30 characters.' });
        }

        // 2. Resolve target Service Details (for accurate pricing constraints)
        const { data: provider, error: pErr } = await supabase
            .from('providers')
            .select('*, profiles!id(phone)')
            .eq('id', providerId)
            .single();

        if (pErr || !provider) {
            console.log(`[WARNING] Booking Rejected: Target Provider UUID string not found in DB`);
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        // 3. Draft & Dispatch Payload
        const bookingId = 'TF-' + Math.floor(100000 + Math.random() * 900000);
        const newBooking = {
            id: bookingId,
            customer_id: req.user.id,
            provider_id: providerId,
            booking_date: date,
            booking_time: time,
            description,
            address: address,
            is_emergency: isEmergency || false,
            status: 'pending', // Default booking state
            price: provider.base_price, // Fixed by provider metadata initially
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('bookings').insert(newBooking).select().single();
        if (error) throw error;

        console.log(`[SUCCESS] Booking initialized: ID ${bookingId}`);
        return res.status(201).json({
            success: true,
            message: `Booking confirmed with ${provider.business_name}!`,
            booking: {
                ...data,
                providerName: provider.business_name,
                providerCategory: provider.category,
                providerPhone: provider.profiles?.phone
            }
        });

    } catch (error) {
        console.error(`[ERROR] Booking generation critically failed:`, error.message);
        return res.status(500).json({ success: false, message: 'Supabase Error', error: error.message });
    }
};

// ==========================================
// 2. Booking Data Aggregation
// ==========================================

/**
 * @route   GET /api/bookings/customer
 * @desc    Fetch an entire bookings history payload mapped explicitly for a customer
 * @access  Private (Customer Only)
 */
exports.getCustomerBookings = async (req, res) => {
    try {
        console.log(`[INFO] Retrieving Booking Timeline: Customer ${req.user.id}`);

        const { data, error } = await supabase
            .from('bookings')
            .select('*, provider:providers(*, profiles!id(phone))')
            .eq('customer_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map legacy UI properties to the Postgres dataset format
        const formatted = data.map(b => ({
            ...b,
            date: b.booking_date,
            time: b.booking_time,
            providerName: b.provider ? b.provider.business_name : 'Unknown Service',
            providerPhone: b.provider && b.provider.profiles ? b.provider.profiles.phone : null
        }));

        console.log(`[SUCCESS] Customer fetched ${formatted.length} historical bookings.`);
        return res.status(200).json({ success: true, bookings: formatted });

    } catch (error) {
        console.error(`[ERROR] Failed to fetch customer timeline:`, error.message);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   GET /api/bookings/provider
 * @desc    Fetch task history assignments mapping customer data mapped explicitly for a provider
 * @access  Private (Provider Only)
 */
exports.getProviderBookings = async (req, res) => {
    try {
        console.log(`[INFO] Retrieving Work Pipeline: Provider ${req.user.id}`);

        const { data, error } = await supabase
            .from('bookings')
            .select('*, customer:profiles!customer_id(*)')
            .eq('provider_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = data.map(b => ({
            ...b,
            date: b.booking_date,
            time: b.booking_time,
            customerName: b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : 'Unknown',
            customerPhone: b.customer ? b.customer.phone : null
        }));

        console.log(`[SUCCESS] Provider pipeline returned ${formatted.length} tasks.`);
        return res.status(200).json({ success: true, bookings: formatted });

    } catch (error) {
        console.error(`[ERROR] Failed to fetch provider pipeline:`, error.message);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ==========================================
// 3. Workflow Progression
// ==========================================

/**
 * @route   PATCH /api/bookings/:id/status
 * @desc    Updates the completion workflow status map for a particular booking
 * @access  Private (Provider/Admin Only)
 */
exports.updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        console.log(`[INFO] Advancing status [${status}] for Booking ${id}`);

        const { data, error } = await supabase
            .from('bookings')
            .update({ status })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) throw new Error(error.message || 'No update returned from database');

        if (!data) {
            console.log(`[WARNING] Booking update dropped (ID ${id} not found in database or RLS blocked it).`);
            return res.status(404).json({ success: false, message: 'Booking not found in the live database. (If testing, UI mock ID might not exist)' });
        }

        // Logic Hook: Increment provider reputation stats on completion explicitly.
        if (status === 'completed') {
            const { data: booking } = await supabase.from('bookings').select('provider_id').eq('id', id).single();
            if (booking) {
                const { data: provider } = await supabase.from('providers').select('completed_jobs').eq('id', booking.provider_id).single();
                if (provider) {
                    await supabase.from('providers').update({ completed_jobs: (provider.completed_jobs || 0) + 1 }).eq('id', booking.provider_id);
                }
            }
        }

        console.log(`[SUCCESS] Advanced status block execution completed.`);
        return res.status(200).json({ success: true, message: `Booking updated to ${status}`, booking: data });

    } catch (error) {
        console.error(`[ERROR] Status block advancement failed:`, error.message);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   POST /api/bookings/:id/rate
 * @desc    Submit reviews dynamically for completed tasks
 * @access  Private (Customer Only)
 */
exports.rateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;
        console.log(`[INFO] Rating submission triggered [${rating} Stars] for Booking ${id}`);

        const { data, error } = await supabase
            .from('bookings')
            .update({ rating: Number(rating), review_text: review })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        console.log(`[SUCCESS] Review logic logged.`);
        return res.status(200).json({ success: true, message: 'Rating submitted successfully', booking: data });

    } catch (error) {
        console.error(`[ERROR] Rating generation failed:`, error.message);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
