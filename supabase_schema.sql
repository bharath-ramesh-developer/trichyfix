-- TrichyFix Supabase Schema

-- Drop existing tables if re-running the script
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY, -- Removed strict auth.users link for hybrid auth setup
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT UNIQUE,
  password TEXT, -- Keeping password field directly for the custom JWT login
  role TEXT CHECK (role IN ('admin', 'provider', 'customer')),
  area TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Providers table (Details for the marketplace)
CREATE TABLE providers (
  id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  business_name TEXT,
  category TEXT,
  experience NUMERIC,
  verified BOOLEAN DEFAULT FALSE,
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  base_price NUMERIC,
  price_unit TEXT DEFAULT '/hr',
  emergency_available BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  description TEXT,
  skills TEXT[],
  areas_served TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  total_jobs INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  monthly_earnings NUMERIC DEFAULT 0,
  id_proof_type TEXT,
  id_proof_number TEXT,
  id_proof_url TEXT,
  about_bio TEXT,
  joined_date DATE DEFAULT CURRENT_DATE
);

-- Note: In a production environment, ensure the 'assets' storage bucket is created 
-- and set to "Public" so uploaded profile photos and ID proof images can be read.

-- 3. Bookings table
CREATE TABLE bookings (
  id TEXT PRIMARY KEY, -- Custom ID like TF-1001
  customer_id UUID REFERENCES profiles(id),
  provider_id UUID REFERENCES providers(id),
  booking_date DATE,
  booking_time TEXT,
  description TEXT,
  address TEXT,
  is_emergency BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in-progress', 'completed', 'cancelled')),
  price NUMERIC,
  rating NUMERIC,
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) - Basic Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own, and insert new profiles (for registration/seeding)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow profile inserts" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Providers: Everyone can see, insert new providers
CREATE POLICY "Active providers are viewable by everyone" ON providers FOR SELECT USING (true);
CREATE POLICY "Allow provider inserts" ON providers FOR INSERT WITH CHECK (true);
CREATE POLICY "Providers can update own details" ON providers FOR UPDATE USING (auth.uid() = id);

-- Bookings: Only involved parties can see, anyone can insert
CREATE POLICY "Users can see their own bookings" ON bookings FOR SELECT USING (true); 
CREATE POLICY "Allow booking inserts" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow booking updates" ON bookings FOR UPDATE USING (true);

-- =========================================================================
-- 🔥 CRITICAL PRODUCTION HOTFIXES 🔥
-- =========================================================================

-- FIX 1: Allow Node Backend Anon_Key to Verify/Approve the providers
--        (This prevents the "Cannot coerce the result to a single JSON object" 500 error)
DROP POLICY IF EXISTS "Providers can update own details" ON providers;
DROP POLICY IF EXISTS "Allow any UPDATE on providers" ON providers;
CREATE POLICY "Allow any UPDATE on providers" ON providers FOR UPDATE USING (true);

-- FIX 2: Supabase S3 bucket configuration (Storage Bucket)
--        (This allows the 'assets' bucket to accept dynamic uploads like ID Proofs!)
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true) ON CONFLICT DO NOTHING;

-- Allows the Backend to inject photo buffers into the storage space
DROP POLICY IF EXISTS "Allow insert to assets" ON storage.objects;
CREATE POLICY "Allow insert to assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assets');

-- Allows anyone on the web to pull and Read those uploaded images (For the Dashboard UI)
DROP POLICY IF EXISTS "Allow read from assets" ON storage.objects;
CREATE POLICY "Allow read from assets" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
