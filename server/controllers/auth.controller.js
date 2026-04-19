const { supabase } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const { JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES_IN } = require('../config/jwt');

// Store OTPs temporarily in memory. Note: Scale with Redis in real production.
const otpStore = new Map();

/**
 * Helper function to generate local custom JWT tokens.
 * @param {string} userId - User's UUID
 * @param {string} role - 'admin', 'provider', or 'customer'
 * @returns {string} - Signed JWT token
 */
const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Helper function to generate local custom JWT refresh tokens.
 * @param {string} userId - User's UUID
 * @param {string} role - 'admin', 'provider', or 'customer'
 * @returns {string} - Signed JWT Refresh Token
 */
const generateRefreshToken = (userId, role) => {
    return jwt.sign({ id: userId, role }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

/**
 * Standardizes phone string to +91 XXXXXXXXXX format to prevent exact-match DB failure
 */
const normalizePhone = (phoneStr) => {
    if (!phoneStr) return '';
    const digits = phoneStr.replace(/\D/g, '');
    let coreNumber = digits;
    if (digits.length > 10 && digits.startsWith('91')) {
        coreNumber = digits.slice(-10);
    }
    if (coreNumber.length === 10) {
        return `+91 ${coreNumber}`;
    }
    return phoneStr; // Fallback
};

/**
 * Controller: Auth
 * Handles User registration, OTP mechanics, Login generation, and profile management.
 */

// ==========================================
// 1. OTP / Phone Verification Logic
// ==========================================

/**
 * @route   POST /api/auth/send-otp
 * @desc    Sends a one-time-password to the specified phone number
 * @access  Public
 */
exports.sendOTP = async (req, res) => {
    try {
        const { phone, purpose } = req.body;
        const normalizedPhone = normalizePhone(phone);
        console.log(`[INFO] Requesting 2Factor SMS OTP for ${normalizedPhone} [Purpose: ${purpose}]`);

        if (purpose === 'forgot_password') {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('phone', normalizedPhone)
                .single();
            if (error || !profile) {
                return res.status(404).json({ success: false, message: 'No account found with this phone number.' });
            }
        }

        if (purpose === 'register' && req.body.role) {
            const { role } = req.body;
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, role')
                .eq('phone', normalizedPhone)
                .single();
            
            if (profile && profile.role === role) {
                return res.status(400).json({ success: false, message: 'Phone number already exists for this role.' });
            }
        }

        // Clean phone number (remove non-digits). 2factor expects country code format e.g., 91xxxxxxxxx
        let cleanPhone = normalizedPhone.replace(/\D/g, '');
        if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
        }

        // Generate a 4-digit OTP matching the explicit XXXX template defined in 2Factor approved dashboard
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const apiKey = process.env.TWOFACTOR_API_KEY;

        if (!apiKey) {
            console.log(`[WARNING] TWOFACTOR_API_KEY key missing. Falling back to local Mock OTP.`);
            otpStore.set(normalizedPhone, { otp, expires: Date.now() + 5 * 60 * 1000, fallback: true, purpose });
            return res.status(200).json({ success: true, message: `(Dev Mode) OTP sent to ${normalizedPhone}`, devOTP: otp });
        }

        // Dispatch HTTP request to 2Factor.in securely explicitly passing {otp} into approved {template_name}
        const response = await fetch(`https://2factor.in/API/V1/${apiKey}/SMS/${cleanPhone}/${otp}/OPT-new`);
        const data = await response.json();

        if (data.Status !== 'Success') {
            console.log(`[WARNING] 2factor SMS failed: ${data.Details} - Falling back to local Mock OTP bypass`);
            otpStore.set(normalizedPhone, { otp, expires: Date.now() + 5 * 60 * 1000, fallback: true, purpose });
            return res.status(200).json({ success: true, message: `OTP sent via local dev to ${normalizedPhone}`, devOTP: otp });
        }

        // Cache safely for secure instant local verify mechanism bypassing double-hop verifications
        otpStore.set(normalizedPhone, { otp, expires: Date.now() + 5 * 60 * 1000, fallback: true, purpose });

        console.log(`[SUCCESS] 2Factor SMS OTP explicitly dispatched to inbox: ${normalizedPhone}. Session: ${data.Details}`);
        return res.status(200).json({ success: true, message: `OTP sent live to ${normalizedPhone} via 2Factor` });

    } catch (error) {
        console.error(`[ERROR] Failed to send external 2Factor OTP:`, error.message);
        return res.status(500).json({ success: false, message: 'Failed to dispatch physical SMS via 2factor', error: error.message });
    }
};

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Check if an input OTP matches the generated one
 * @access  Public
 */
exports.verifyOTP = async (req, res) => {
    try {
        const { phone, otp, purpose } = req.body;
        const normalizedPhone = normalizePhone(phone);

        // Verify instantly using our dictionary synced to our 2Factor dispatch loop
        const fallbackStored = otpStore.get(normalizedPhone);
        if (fallbackStored) {
            if (Date.now() > fallbackStored.expires) {
                otpStore.delete(phone);
                return res.status(400).json({ success: false, message: 'OTP expired' });
            }
            if (fallbackStored.otp !== otp) {
                return res.status(400).json({ success: false, message: 'Invalid OTP' });
            }
            if (fallbackStored.purpose && fallbackStored.purpose !== purpose) {
                return res.status(400).json({ success: false, message: 'OTP purpose mismatch' });
            }
            otpStore.delete(normalizedPhone);
            console.log(`[SUCCESS] SMS verify success for ${normalizedPhone}`);
            return res.status(200).json({ success: true, message: 'Phone verified successfully' });
        }

        return res.status(400).json({ success: false, message: 'OTP expired or not requested' });

    } catch (error) {
        console.error(`[ERROR] Standard verify OTP error:`, error.message);
        return res.status(500).json({ success: false, message: 'Server verify error', error: error.message });
    }
};

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using OTP
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
    try {
        const { phone, otp, newPassword } = req.body;
        const normalizedPhone = normalizePhone(phone);
        console.log(`[INFO] Reset password attempt for: ${normalizedPhone}`);

        const fallbackStored = otpStore.get(normalizedPhone);
        if (!fallbackStored || Date.now() > fallbackStored.expires || fallbackStored.otp !== otp || fallbackStored.purpose !== 'forgot_password') {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP token for password reset' });
        }

        // 1. First find the profile to get the ID
        const { data: profile, error: findErr } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', normalizedPhone)
            .single();

        if (findErr || !profile) {
            console.error('[ERROR] Reset password: profile not found for', normalizedPhone);
            return res.status(404).json({ success: false, message: 'No account found with this phone number' });
        }

        // 2. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 3. Update by ID and use .select() to verify the row actually changed
        const { data: updated, error } = await supabase
            .from('profiles')
            .update({ password: hashedPassword })
            .eq('id', profile.id)
            .select('id')
            .single();

        if (error) {
            console.error('[ERROR] Reset password update failed:', error.message);
            return res.status(500).json({ success: false, message: 'Failed to reset password' });
        }

        if (!updated) {
            console.error('[ERROR] Reset password: update returned no rows (possible RLS block)');
            return res.status(500).json({ success: false, message: 'Password update was blocked. Please contact support.' });
        }

        otpStore.delete(normalizedPhone);
        console.log(`[SUCCESS] Password successfully reset for ${normalizedPhone} (profile: ${profile.id})`);
        return res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('[ERROR] Reset password error:', error.message);
        return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// ==========================================
// 2. Authentication Login Systemsc
// ==========================================

/**
 * @route   POST /api/auth/login
 * @desc    Log in with email and password, returning JWT token
 * @access  Public
 */
exports.login = async (req, res) => {
    try {
        const { phone, password } = req.body;
        const normalizedPhone = normalizePhone(phone);
        console.log(`[INFO] Standard Login attempt for: ${normalizedPhone}`);

        // 1. Fetch user profile
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone', normalizedPhone)
            .single();

        if (error || !profile) {
            console.log(`[WARNING] Login failed: User not found [${normalizedPhone}]`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // 2. Validate password
        const isMatch = await bcrypt.compare(password, profile.password || '');
        if (!isMatch) {
            console.log(`[WARNING] Login failed: Incorrect password [${normalizedPhone}]`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // 3. Issue Token
        const token = generateToken(profile.id, profile.role);
        const refreshToken = generateRefreshToken(profile.id, profile.role);

        console.log(`[SUCCESS] User authenticated successfully: ${normalizedPhone}`);
        return res.status(200).json({ success: true, message: 'Login successful', token, refreshToken, user: profile });

    } catch (error) {
        console.error(`[ERROR] Authentication error:`, error.message);
        return res.status(500).json({ success: false, message: 'Auth Error', error: error.message });
    }
};

/**
 * @route   POST /api/auth/login/otp
 * @desc    Log in instantly using a phone OTP bypass
 * @access  Public
 */
exports.loginWithOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const normalizedPhone = normalizePhone(phone);
        console.log(`[INFO] 2Factor / SMS Login bypass attempt for: ${normalizedPhone}`);

        let isVerified = false;

        // Unified local verification logic synced directly from 2Factor payload injection 
        const fallbackStored = otpStore.get(normalizedPhone);
        if (fallbackStored) {
            if (Date.now() <= fallbackStored.expires && fallbackStored.otp === otp) {
                isVerified = true;
                otpStore.delete(normalizedPhone);
            }
        }

        if (!isVerified) {
            console.log(`[WARNING] SMS Login definitively failed by ${normalizedPhone}`);
            return res.status(401).json({ success: false, message: 'Invalid or expired OTP token' });
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone', normalizedPhone)
            .single();

        if (error || !profile) {
            console.log(`[WARNING] Physical SMS true, but phone target not linked to app account [${normalizedPhone}]`);
            return res.status(404).json({ success: false, message: 'Phone SMS verified, but no app account matches that number' });
        }

        const token = generateToken(profile.id, profile.role);
        const refreshToken = generateRefreshToken(profile.id, profile.role);

        console.log(`[SUCCESS] OTP login successful for: ${normalizedPhone}`);
        return res.status(200).json({ success: true, message: 'Login successful', token, refreshToken, user: profile });

    } catch (error) {
        console.error(`[ERROR] OTP Login failed:`, error.message);
        return res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
};

// ==========================================
// 3. Registration Logic
// ==========================================

/**
 * @route   POST /api/auth/register/customer
 * @desc    Registers a new standard user
 * @access  Public
 */
exports.registerCustomer = async (req, res) => {
    try {
        const { firstName, lastName, phone, password, area } = req.body;
        const normalizedPhone = normalizePhone(phone);
        console.log(`[INFO] Registering new CUSTOMER: ${normalizedPhone}`);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newId = uuidv4();

        const newProfile = {
            id: newId,
            first_name: firstName,
            last_name: lastName,
            phone: normalizedPhone,
            password: hashedPassword,
            role: 'customer',
            area,
            phone_verified: true
        };

        const { data, error } = await supabase.from('profiles').insert(newProfile).select().single();
        if (error) throw error;

        const token = generateToken(data.id, 'customer');
        const refreshToken = generateRefreshToken(data.id, 'customer');

        console.log(`[SUCCESS] Customer created: ${normalizedPhone}`);
        return res.status(201).json({ success: true, message: 'Registration successful', token, refreshToken, user: data });

    } catch (error) {
        console.error(`[ERROR] Customer registration failed:`, error.message);
        return res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
};

/**
 * @route   POST /api/auth/register/provider
 * @desc    Registers a new service provider (Creates Profile + Details)
 * @access  Public
 */
exports.registerProvider = async (req, res) => {
    try {
        const { fullName, phone, password, experience, categories, areasServed, priceMin, idProofType, aboutBio } = req.body;
        const normalizedPhone = normalizePhone(phone);
        console.log(`[INFO] Registering new PROVIDER: ${normalizedPhone}`);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newId = uuidv4();

        // Handle File Uploads specifically for Supabase S3
        let profilePhotoUrl = null;
        let idProofUrl = null;

        if (req.files) {
            // Helper function to pipe memory buffer into Supabase Storage Bucket
            const uploadToS3 = async (fileBuffer, originalName, mimeType, folderPath) => {
                const uniqueName = Date.now() + '-' + originalName.replace(/[^a-zA-Z0-9.\-]/g, '');
                const filePath = `${folderPath}/${newId}/${uniqueName}`;
                // Crucial: passing real explicitly parsed mimetype instead of 'auto' bounds the File Object securely.
                const { data, error } = await supabase.storage.from('assets').upload(filePath, fileBuffer, {
                    contentType: mimeType,
                    upsert: true
                });
                if (error) {
                    console.error('[WARNING] S3 Upload Dropped:', error.message);
                    return null;
                }
                const { data: publicUrlData } = supabase.storage.from('assets').getPublicUrl(filePath);
                return publicUrlData.publicUrl;
            };

            if (req.files.profilePhoto && req.files.profilePhoto[0]) {
                const file = req.files.profilePhoto[0];
                profilePhotoUrl = await uploadToS3(file.buffer, file.originalname, file.mimetype, 'profiles');
            }

            if (req.files.idProof && req.files.idProof[0]) {
                const file = req.files.idProof[0];
                idProofUrl = await uploadToS3(file.buffer, file.originalname, file.mimetype, 'proofs');
            }
        }

        // 1. Create Core Profile or use existing
        let profileData;
        const { data: existingProfile } = await supabase.from('profiles').select('*').eq('phone', normalizedPhone).single();

        if (existingProfile) {
            if (existingProfile.role === 'provider') {
                return res.status(400).json({ success: false, message: 'Phone number already registered as a provider' });
            }
            // User exists as customer, UPGRADE to provider
            const { data, error: updateErr } = await supabase.from('profiles').update({
                role: 'provider',
                first_name: fullName.split(' ')[0],
                last_name: fullName.split(' ').slice(1).join(' '),
                password: hashedPassword,
                profile_photo_url: profilePhotoUrl
            }).eq('id', existingProfile.id).select().single();
            
            if (updateErr) throw updateErr;
            profileData = data;
        } else {
            const newProfile = {
                id: newId,
                first_name: fullName.split(' ')[0],
                last_name: fullName.split(' ').slice(1).join(' '),
                phone: normalizedPhone,
                password: hashedPassword,
                role: 'provider',
                phone_verified: true,
                profile_photo_url: profilePhotoUrl
            };
            const { data, error: profileErr } = await supabase.from('profiles').insert(newProfile).select().single();
            if (profileErr) throw profileErr;
            profileData = data;
        }

        const currentProfileId = profileData.id;

        // 2. Create Marketplace Specifics
        let parsedCategories = [];
        let parsedAreas = [];
        try {
            parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
            parsedAreas = typeof areasServed === 'string' ? JSON.parse(areasServed) : areasServed;
        } catch (e) {
            // Ignore parse errors if they were already arrays
        }

        const newProvider = {
            id: currentProfileId,
            business_name: fullName,
            category: parsedCategories && parsedCategories.length > 0 ? parsedCategories[0] : 'General',
            experience: Number(experience) || 0,
            base_price: Number(priceMin) || 0,
            skills: parsedCategories || [],
            areas_served: parsedAreas || [],
            id_proof_type: idProofType,
            id_proof_url: idProofUrl,
            about_bio: aboutBio,
            status: 'pending' // Admin approval required
        };

        const { error: providerErr } = await supabase.from('providers').insert(newProvider);
        if (providerErr) throw providerErr;

        const token = generateToken(profileData.id, 'provider');
        const refreshToken = generateRefreshToken(profileData.id, 'provider');

        console.log(`[SUCCESS] Provider registered (Pending Status): ${email}`);
        return res.status(201).json({ success: true, message: 'Provider registration successful', token, refreshToken, user: profileData });

    } catch (error) {
        console.error(`[ERROR] Provider registration failed:`, error.message);
        return res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
};

/**
 * @route   GET /api/auth/profile
 * @desc    Retrieves profile information for the authenticated user
 * @access  Private
 */
exports.getProfile = async (req, res) => {
    try {
        console.log(`[INFO] Requesting user profile for: ${req.user.id}`);

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error || !profile) {
            console.log(`[WARNING] Requesting profile failed: Not found`);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        console.log(`[SUCCESS] Profile retrieved for ${profile.email}`);
        return res.status(200).json({ success: true, user: profile });

    } catch (error) {
        console.error(`[ERROR] Failed to fetch profile:`, error.message);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Generate a new access token using a valid refresh token payload
 * @access  Public (Requires raw refresh token string)
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh token is explicitly required' });
        }

        // Verify validity of the refresh token sequence
        jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user) => {
            if (err) {
                console.log(`[WARNING] Refresh Token verification rejected.`);
                return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
            }

            // Re-issue a shiny new access token using the preserved payload contents
            const newAccessToken = generateToken(user.id, user.role);

            console.log(`[SUCCESS] Regenerated access token block for User: ${user.id}`);
            return res.status(200).json({
                success: true,
                token: newAccessToken,
            });
        });

    } catch (error) {
        console.error(`[ERROR] Token refresh critically failed:`, error.message);
        return res.status(500).json({ success: false, message: 'Server Configuration Error', error: error.message });
    }
};
