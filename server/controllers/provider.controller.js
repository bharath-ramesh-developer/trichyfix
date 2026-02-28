const { supabase } = require('../config/supabase');

/**
 * Controller: Provider
 * Handles all operations related to service providers including fetching lists,
 * resolving details, and aggregating dashboard statistics.
 */

/**
 * @route   GET /api/providers
 * @desc    Retrieves a list of providers with optional filtering and sorting
 * @access  Public
 */
exports.getProviders = async (req, res) => {
    try {
        console.log(`[INFO] Fetching providers list. Query:`, req.query);
        const { category, area, emergency, search, sort } = req.query;

        // Start Supabase query - only active providers
        let query = supabase.from('providers').select('*, profiles!id(first_name, last_name, profile_photo_url)').eq('status', 'active');

        // Apply filters
        if (category && category !== 'All Services') {
            query = query.eq('category', category);
        }
        if (emergency === 'true') {
            query = query.eq('emergency_available', true);
        }

        // Note: For complex text search or array containment (like area),
        // we might do a post-filter if native postgres fns aren't setup.
        // For simplicity and accuracy with the hybrid structure, we'll fetch then filter.

        const { data: providers, error } = await query;
        if (error) throw error;

        let filtered = providers;

        // In-memory advanced filtering (Areas & Search Text)
        if (area && area !== 'All Areas') {
            filtered = filtered.filter(p => p.areas_served && p.areas_served.includes(area));
        }

        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(p =>
                (p.business_name && p.business_name.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q))
            );
        }

        // Apply Sorting
        if (sort === 'price-low') {
            filtered.sort((a, b) => Number(a.base_price) - Number(b.base_price));
        } else if (sort === 'price-high') {
            filtered.sort((a, b) => Number(b.base_price) - Number(a.base_price));
        } else {
            // Default: Sort by rating (Highest first)
            filtered.sort((a, b) => Number(b.rating) - Number(a.rating));
        }

        // Format mapping to match old UI requirements
        const formatted = filtered.map(p => ({
            ...p,
            name: p.business_name,
            price: p.base_price,
            emergency: p.emergency_available
        }));

        console.log(`[SUCCESS] Providers fetched globally: ${formatted.length}`);
        return res.status(200).json({ success: true, count: formatted.length, providers: formatted });

    } catch (error) {
        console.error(`[ERROR] Failed to fetch providers:`, error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

/**
 * @route   GET /api/providers/:id
 * @desc    Get detailed provider information by their UUID
 * @access  Public
 */
exports.getProviderById = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[INFO] Fetching details for provider ID: ${id}`);

        const { data: provider, error } = await supabase
            .from('providers')
            .select('*, profiles!id(first_name, last_name, email, phone, profile_photo_url)')
            .eq('id', id)
            .single();

        if (error || !provider) {
            console.log(`[WARNING] Provider not found for ID: ${id}`);
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const formatted = {
            ...provider,
            name: provider.business_name,
            price: provider.base_price,
            emergency: provider.emergency_available,
            phone: provider.profiles.phone,
            email: provider.profiles.email
        };

        console.log(`[SUCCESS] Found provider: ${formatted.name}`);
        return res.status(200).json({ success: true, provider: formatted });

    } catch (error) {
        console.error(`[ERROR] Failed to fetch provider details:`, error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

/**
 * @route   GET /api/providers/dashboard
 * @desc    Get aggregate stats and recent bookings for the logged-in provider
 * @access  Private (Provider only)
 */
exports.getDashboard = async (req, res) => {
    try {
        console.log(`[INFO] Fetching dashboard for provider ID: ${req.user.id}`);

        // 1. Fetch Provider Details
        const { data: provider, error: pErr } = await supabase
            .from('providers')
            .select('total_jobs, completed_jobs, monthly_earnings, rating, reviews_count')
            .eq('id', req.user.id)
            .single();

        if (pErr || !provider) {
            console.log(`[WARNING] Active provider account block not found for ${req.user.id}`);
            return res.status(404).json({ success: false, message: 'Provider profile not found' });
        }

        // 2. Fetch Provider's Bookings
        const { data: bookings, error: bErr } = await supabase
            .from('bookings')
            .select('*, customer:profiles!customer_id(*)')
            .eq('provider_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (bErr) throw bErr;

        const formattedBookings = bookings.map(b => ({
            ...b,
            date: b.booking_date,
            time: b.booking_time,
            customerName: b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : 'Unknown',
            customerPhone: b.customer ? b.customer.phone : null
        }));

        console.log(`[SUCCESS] Provider dashboard compiled successfully`);
        return res.status(200).json({
            success: true,
            stats: {
                totalJobs: provider.total_jobs || 0,
                completedJobs: provider.completed_jobs || 0,
                monthlyEarnings: provider.monthly_earnings || 0,
                avgRating: provider.rating || 0,
                reviews: provider.reviews_count || 0
            },
            recentBookings: formattedBookings
        });

    } catch (error) {
        console.error(`[ERROR] Failed fetching provider dashboard:`, error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

/**
 * @route   GET /api/providers/categories
 * @desc    Hardware map of available service categories
 * @access  Public
 */
exports.getCategories = async (req, res) => {
    return res.status(200).json({
        success: true,
        categories: [
            { name: 'All Services', icon: 'grid' },
            { name: 'Electrician', icon: 'zap' },
            { name: 'Plumber', icon: 'wrench' },
            { name: 'AC Repair', icon: 'snowflake' },
            { name: 'Appliance', icon: 'plug' },
            { name: 'Painting', icon: 'palette' },
            { name: 'Carpentry', icon: 'hammer' }
        ]
    });
};

/**
 * @route   GET /api/providers/areas
 * @desc    Hardware map of available regional areas
 * @access  Public
 */
exports.getAreas = async (req, res) => {
    return res.status(200).json({
        success: true,
        areas: [
            'All Areas', 'KK Nagar', 'Srirangam', 'Thillai Nagar',
            'Woraiyur', 'Cantonment', 'Puthur', 'Tennur', 'Crawford', 'Karumandapam'
        ]
    });
};
