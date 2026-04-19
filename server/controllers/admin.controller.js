const { supabase } = require('../config/supabase');

/**
 * Controller: Admin Operations
 * Houses supreme system privileges like tracking revenue, mass fetching queries,
 * and authorizing/banning pending service providers.
 */

// ==========================================
// 1. Dashboard & Statistics Payload
// ==========================================

/**
 * @route   GET /api/admin/stats
 * @desc    Retrieves top-level KPIs, total revenue streams, and unapproved provider counts
 * @access  Private (Admin Only)
 */
exports.getStats = async (req, res) => {
  try {
    console.log(`[INFO] Admin requested global Supabase statistics map.`);

    // Aggregated Fetch (Execute concurrently for speed)
    const [
      { data: users, error: userErr },
      { data: providers, error: provErr },
      { data: bookings, error: bookErr }
    ] = await Promise.all([
      supabase.from('profiles').select('id'),
      supabase.from('providers').select('*, profiles!id(*)'),
      supabase.from('bookings').select('*, customer:profiles!customer_id(first_name, last_name), provider:providers(business_name)')
    ]);

    if (userErr || provErr || bookErr) throw new Error('Data stream fetch failed during aggregation.');

    // Accumulate Platform Value (gross lifetime completion)
    const totalRevenue = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (Number(b.price) || 0), 0);

    // Calculate KPI Contexts
    const activeProviders = providers.filter(p => p.status === 'active').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;

    const statsArray = [
      { label: 'Total Users', value: users.length, icon: '👥', color: '#8B5CF6', change: 'Live from DB' },
      { label: 'Total Providers', value: providers.length, icon: '👨‍🔧', color: '#3B82F6', change: `${activeProviders} active` },
      { label: 'Total Bookings', value: bookings.length, icon: '📅', color: '#22C55E', change: `${pendingBookings} pending` },
      { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: '💰', color: '#F5A623', change: 'Real-time' }
    ];

    // Format recent snapshots
    const recentSnapshots = bookings
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8)
      .map(b => ({
        ...b,
        date: b.booking_date,
        time: b.booking_time,
        customerName: b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : 'Unknown',
        providerName: b.provider ? b.provider.business_name : 'Unknown'
      }));

    const reviewQueue = providers
      .filter(p => p.status === 'pending')
      .map(p => ({
        id: p.id,
        name: p.business_name || (p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : 'Unknown'),
        category: p.category,
        area: Array.isArray(p.areas_served) ? p.areas_served.join(', ') : (p.profiles?.area || 'Not specified'),
        experience: p.experience || 0,
        phone: p.profiles?.phone || 'Not provided',
        email: p.profiles?.email || 'Not provided',
        status: p.status,
        joinedDate: p.joined_date || p.profiles?.created_at,
        idProofType: p.id_proof_type || 'Unknown ID',
        idProofNumber: p.id_proof_number || '-',
        idProofUrl: p.id_proof_url || null,
        skills: Array.isArray(p.skills) ? p.skills : [],
        profilePhoto: p.profiles?.profile_photo_url || null,
        aboutBio: p.about_bio || ''
      }));

    console.log(`[SUCCESS] Admin KPI dashboard generated correctly.`);
    return res.status(200).json({
      success: true,
      stats: statsArray,
      recentBookings: recentSnapshots,
      pendingProviders: reviewQueue
    });

  } catch (error) {
    console.error(`[ERROR] Admin Statistics compilation failed:`, error.message);
    return res.status(500).json({ success: false, message: 'Supabase Error', error: error.message });
  }
};

// ==========================================
// 2. Global Directories
// ==========================================

/**
 * @route   GET /api/admin/users
 * @desc    Unrestricted mass-fetch for all profiles in the database
 * @access  Private (Admin Only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    console.log(`[INFO] Administrator fetching complete underlying user profile datatable.`);

    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;

    console.log(`[SUCCESS] Retrieved ${data.length} profiles for Admin panel`);
    return res.status(200).json({ success: true, users: data });

  } catch (error) {
    console.error(`[ERROR] Users retrieval crashed:`, error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @route   GET /api/admin/providers
 * @desc    Unrestricted mass-fetch for all providers regardless of status blockages
 * @access  Private (Admin Only)
 */
exports.getAllProviders = async (req, res) => {
  try {
    console.log(`[INFO] Administrator fetching complete underlying provider datatable.`);

    const { data, error } = await supabase.from('providers').select('*, profiles!id(first_name, last_name, phone, email, profile_photo_url)');
    if (error) throw error;

    const formatted = data.map(p => ({
      ...p,
      name: p.business_name || (p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : 'Unknown'),
      phone: p.profiles?.phone || 'Not provided',
      email: p.profiles?.email || 'Not provided',
      area: Array.isArray(p.areas_served) && p.areas_served.length > 0 ? p.areas_served.join(', ') : 'Not specified',
      profilePhoto: p.profiles?.profile_photo_url || null
    }));

    console.log(`[SUCCESS] Retrieved ${formatted.length} providers for Admin panel`);
    return res.status(200).json({ success: true, providers: formatted });

  } catch (error) {
    console.error(`[ERROR] Providers retrieval crashed:`, error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @route   GET /api/admin/bookings
 * @desc    Unrestricted block-fetch resolving related profile references into Booking maps
 * @access  Private (Admin Only)
 */
exports.getAllBookings = async (req, res) => {
  try {
    console.log(`[INFO] Administrator fetching complete booking transaction directory.`);

    const { data, error } = await supabase
      .from('bookings')
      .select('*, customer:profiles!customer_id(*), provider:providers(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to standard internal expected structure for UI tables explicitly
    const formatted = data.map(b => ({
      ...b,
      date: b.booking_date,
      time: b.booking_time,
      customerName: b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : 'Unknown',
      providerName: b.provider ? b.provider.business_name : 'Unknown'
    }));

    console.log(`[SUCCESS] Returned ${formatted.length} fully structured booking packets.`);
    return res.status(200).json({ success: true, bookings: formatted });

  } catch (error) {
    console.error(`[ERROR] Booking generation crashed natively:`, error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ==========================================
// 3. Status Override
// ==========================================

/**
 * @route   PATCH /api/admin/providers/:id/status
 * @desc    Authorizes or revokes access exclusively for Provider accounts
 * @access  Private (Admin Only)
 */
exports.updateProviderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expecting: 'active', 'suspended', or 'rejected'
    console.log(`[INFO] Administrator updating Provider ${id} status to: [${status}]`);

    // If marked active, ensure the boolean flag explicitly matches.
    const isVerified = (status === 'active');

    const { data, error } = await supabase
      .from('providers')
      .update({ status, verified: isVerified })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      console.log(`[WARNING] Provider ${id} update dropped (Likely RLS blocking update on non-auth keys).`);
      return res.status(403).json({
        success: false,
        message: 'Database permission denied. Are Supabase RLS policies preventing updates via ANON keys?'
      });
    }

    console.log(`[SUCCESS] Provider ${id} security gate updated to [${status}] globally.`);
    return res.status(200).json({
      success: true,
      message: `Provider status updated to ${status}`,
      provider: data
    });

  } catch (error) {
    console.error(`[ERROR] Admin override for Provider gate failed:`, error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};



// # Steps to changes deploy:
// 1. docker build - t bharathrameshdeveloper / trichyfix - backend: 1.0.
// 2. docker push bharathrameshdeveloper / trichyfix - backend: 1.0
// 3. Goto render login -> Top right corner -> Manual Deploy -> select(Deploy Latest Reference)
// 4. Push to latest changes to GIT.
// 5. ng build -> dist file is created.
// 5. netlify.toml
// [[redirects]]

// from = "/*"

// to = "/index.html"

// status = 200.

// 6. This file is added to dist / trichyfix / browser.
// 7. Open netlify in the browser -> goto respective project and deploys the dist / trichyfix / browser.
