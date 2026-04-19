-- Seed file to insert Master Roles and Providers
-- Password for all is set to "password123": $2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK
-- Uses ON CONFLICT DO NOTHING to avoid failing on subsequent runs

WITH new_profiles AS (
    INSERT INTO profiles (id, first_name, last_name, phone, password, role, phone_verified, area)
    VALUES 
    -- Master Admin
    (gen_random_uuid(), 'Sys', 'Admin', '+91 9999999990', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'admin', true, 'Head Office'),
    -- Consumer
    (gen_random_uuid(), 'Test', 'Customer', '+91 7777777770', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'customer', true, 'KK Nagar'),
    
    -- Electricians
    (gen_random_uuid(), 'Pro', 'Electrician', '+91 8888888880', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'Thillai Nagar'),
    (gen_random_uuid(), 'Spark', 'Tech', '+91 8888888881', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'Cantonment'),
    -- Plumbers
    (gen_random_uuid(), 'Mani', 'Plumbing', '+91 8888888882', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'Srirangam'),
    (gen_random_uuid(), 'Velu', 'P', '+91 8888888883', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'Woraiyur'),
    -- AC Mechanics
    (gen_random_uuid(), 'Senthil', 'AC', '+91 8888888884', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'Tennur'),
    (gen_random_uuid(), 'Karthi', 'Tech', '+91 8888888885', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'K K Nagar'),
    -- Carpenters
    (gen_random_uuid(), 'Ragu', 'Wood', '+91 8888888886', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'Palakkarai'),
    (gen_random_uuid(), 'Arun', 'Carpenter', '+91 8888888887', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'Edamalaipatti Pudur'),
    -- Cleaning
    (gen_random_uuid(), 'Devi', 'Clean', '+91 8888888888', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'Thiruverumbur'),
    (gen_random_uuid(), 'Meena', 'Homes', '+91 8888888889', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'K K Nagar'),
    -- Painters
    (gen_random_uuid(), 'Raj', 'Painters', '+91 8888888890', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'Srirangam'),
    (gen_random_uuid(), 'Hari', 'Coats', '+91 8888888891', '$2a$10$Pjj4DzpK36njsJf0uilcR.ckeNviZGmklrp882xoT6qYi7Ish9fhK', 'provider', true, 'Thillai Nagar')
    ON CONFLICT (phone) DO NOTHING
    RETURNING id, phone
)
INSERT INTO providers (id, business_name, category, experience, verified, base_price, emergency_available, description, rating, reviews_count)
SELECT 
    np.id,
    p.business_name,
    p.category,
    p.experience,
    p.verified,
    p.base_price,
    p.emergency_available,
    p.description,
    p.rating,
    p.reviews_count
FROM new_profiles np
JOIN (
    VALUES 
    ('+91 8888888880', 'Trichy Fast Fixers', 'Electrician', 5, true, 150, true, 'Fully certified top-rated technician ready to resolve your electrical faults natively.', 4.9, 12),
    ('+91 8888888881', 'Spark Fast Electricals', 'Electrician', 8, true, 200, false, 'Quick spark fixes and electrical wiring.', 4.5, 34),
    ('+91 8888888882', 'Pipe Masters', 'Plumber', 10, true, 100, true, 'Leak masters and pipe fitting experts.', 4.7, 45),
    ('+91 8888888883', 'Quick Flow Plumbing', 'Plumber', 3, true, 120, false, 'Quick flow and clean pipes.', 4.2, 18),
    ('+91 8888888884', 'Cool Breeze AC', 'AC Mechanic', 6, true, 250, true, 'Cool AC repair and regular services.', 4.8, 22),
    ('+91 8888888885', 'Chill Tech', 'AC Mechanic', 4, true, 300, false, 'All brands AC installation and repair.', 4.1, 8),
    ('+91 8888888886', 'Wood Works', 'Carpenter', 12, true, 180, false, 'Furniture building and repairs.', 4.6, 50),
    ('+91 8888888887', 'Fine Build', 'Carpenter', 7, true, 150, true, 'Wooden magic for home and office.', 4.4, 27),
    ('+91 8888888888', 'Sparkle Clean', 'Cleaning', 2, true, 500, false, 'Deep house cleaning and dusting.', 4.0, 5),
    ('+91 8888888889', 'Fresh Homes', 'Cleaning', 5, true, 600, true, 'Fresh home spaces with sanitization.', 4.8, 38),
    ('+91 8888888890', 'Color Splash', 'Painter', 9, true, 400, false, 'Painting works inside and out.', 4.3, 16),
    ('+91 8888888891', 'Dream Coats', 'Painter', 15, true, 450, true, 'Premium wall paints and texture.', 4.9, 62)
) AS p(phone, business_name, category, experience, verified, base_price, emergency_available, description, rating, reviews_count)
ON np.phone = p.phone
ON CONFLICT DO NOTHING;
