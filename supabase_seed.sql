-- 1. Wipe all existing overlapping data out of the system cleanly!
TRUNCATE TABLE profiles CASCADE;

-- 2. Drop the old conflicting Email constraint if it exists.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- 3. Enforce the new strict Mobile Identity uniqueness lock!
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);

-- 4. Enable the crypto extension to generate bcrypt hashes natively inside SQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 5. Seed the 3 master testing accounts directly into the clean database!
INSERT INTO profiles (id, first_name, last_name, phone, password, role, phone_verified, area)
VALUES 
(gen_random_uuid(), 'Sys', 'Admin', '+91 9999999990', crypt('password123', gen_salt('bf', 10)), 'admin', true, 'Head Office'),
(gen_random_uuid(), 'Pro', 'Electrician', '+91 8888888880', crypt('password123', gen_salt('bf', 10)), 'provider', true, 'Thillai Nagar'),
(gen_random_uuid(), 'Test', 'Customer', '+91 7777777770', crypt('password123', gen_salt('bf', 10)), 'customer', true, 'KK Nagar');

-- 6. Link the Provider mapping profile
INSERT INTO providers (id, business_name, category, experience, verified, base_price, emergency_available, description, rating, reviews_count)
SELECT id, 'Trichy Fast Fixers', 'Electrician', 5, true, 150, true, 'Fully certified top-rated technician ready to resolve your electrical faults natively.', 4.9, 12
FROM profiles WHERE phone = '+91 8888888880';
