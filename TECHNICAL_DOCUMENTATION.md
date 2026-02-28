# TrichyFix - Technical Architecture & System Design Documentation

## 1. Application Overview

### Purpose of the Application
**TrichyFix** is a Local Service Marketplace application designed to seamlessly connect local service providers (e.g., plumbers, electricians, cleaners) with customers who require their services. The platform facilitates the entire lifecycle of a service request, from discovery and booking to status tracking and review.

### Target Users
- **Customers:** Individuals seeking local, reliable home and personal services.
- **Service Providers:** Skilled professionals looking to list their services, find jobs, and manage their earnings on a unified platform.
- **Administrators:** Platform managers overseeing user verification, dispute resolution, and overall system health.

### Core Features and Functionalities
- **User Management & Authentication:** Secure registration and login for both customers and providers using JWT.
- **Provider Marketplace:** Detailed provider profiles showcasing skills, experience, ratings, and pricing.
- **Service Booking System:** End-to-end booking flow including scheduling, emergency requests (e.g., immediate plumbing assistance), and status tracking (pending, accepted, in-progress, completed, cancelled).
- **Review & Rating System:** Transparent customer feedback loop to maintain quality.
- **Provider Dashboard:** Track jobs, manage availability, and view monthly earnings.

### Business Goals
- **Empower Local Economies:** Bridge the gap between skilled local workers and community demand.
- **Trust & Safety:** Enforce strict ID verification and maintain high service standards through reviews.
- **Scalability:** Build a robust platform capable of handling peak loads (e.g., seasonal surges in specific service categories).

---

## 2. Architecture Overview

### Type of Architecture Used
The application utilizes a **Client-Server (N-Tier) Architecture** coupled with a **Backend-as-a-Service (BaaS)** model for data and storage components.
- **Frontend Presentation Layer:** Single Page Application (SPA) using Angular.
- **Backend API Layer:** Express.js REST API on Node.js.
- **Data & Auth Layer:** Supabase (PostgreSQL) providing Database, Storage, and Row Level Security (RLS).

### Justification for Choosing this Architecture
- **Separation of Concerns:** Clear boundary between UI (Angular) and business logic (Node.js API), allowing parallel development and independent scaling.
- **Rapid Prototyping & Security:** Leveraging Supabase accelerates database setup and strictly enforces data access rules via PostgreSQL RLS at the foundational level.
- **Performance:** Express.js handles asynchronous API requests efficiently, which is ideal for a high-I/O marketplace application.

### High-Level Architecture Diagram Explanation
1. **Client Device (Web/Mobile Browser):** Hosts the Angular SPA. Sends HTTP REST requests to the Node.js API.
2. **Node.js REST API (Middleware & Routing):** Receives requests, validates JWT tokens, handles business logic (e.g., booking validation, provider status changes), and communicates with Supabase.
3. **Supabase (PostgreSQL & Storage):** Operates as the immutable source of truth. Validates all DB queries against defined RLS policies. The Storage Bucket (`assets`) handles ID proofs and profile photos.

### Layered Structure Breakdown
- **Presentation Layer (Angular `src/app`):** 
  - **Pages:** Feature-specific route entry points (e.g., Provider Dashboard, Booking form).
  - **Components:** Reusable UI widgets.
  - **Services:** HTTP communication with the Backend API.
- **Business Logic Layer (Node.js `server/controllers` & `server/routes`):** Orchestrates actions such as provider verification logic and booking state machines.
- **Infrastructure / Data Layer (Supabase):** Stores relational data (`profiles`, `providers`, `bookings`) and enforces security rules.

---

## 3. System Design

### High-Level System Design (HLD)
The system is divided into three distinct operational planes:
1. **User Interface Plane:** Handles client-side routing, user input validation, and rendering reactive views (Angular).
2. **API Gateway / Application Plane:** An Express gateway routing traffic to independent controller modules (`auth`, `provider`, `booking`, `admin`).
3. **Data Persistence Plane:** A centralized relational database handling ACID compliance across user, provider, and booking records.

### Low-Level System Design (LLD)
- **Controllers:** Thin wrappers parsing HTTP requests and formatting responses.
- **Middleware:** `app.use(express.json())`, `cors()`, and custom authentication middleware protecting specific routes.
- **Storage Strategy:** Multer is used in the Express backend to temporarily handle file uploads before streaming/saving them appropriately, ensuring large payloads don't block the event loop.

### Sequence Flow of Major Operations (Example: Making a Booking)
1. **Customer Action:** User selects a provider and submits booking details. Angular Service sends a `POST /api/bookings`.
2. **Authentication:** Express middleware validates the Customer's JWT token.
3. **Database Insertion:** Backend executes an `INSERT` into the `bookings` table via Supabase client. RLS allows the insert.
4. **Response:** Supabase returns the constructed record; Express responds with HTTP 201 Created.
5. **UI Update:** Angular updates the client state to reflect the new booking in the user's dashboard.

### Data Flow Explanation
Data strictly flows from the Client -> Express router -> Controller -> Supabase DB. Read queries fetch data back through the same pipeline. Static assets (images) are fetched directly from the Supabase `assets` bucket to reduce load on the Node.js server.

---

## 4. Technology Stack

- **Frontend Technologies:** Angular v21 (Standalone Components, Routing, Forms, RxJS), HTML5, CSS3.
- **Backend Technologies:** Node.js v20+, Express.js v4.21.
- **Database:** PostgreSQL (Hosted via Supabase). Chosen for robust relational integrity, JSON support, and built-in RLS capabilities.
- **APIs:** RESTful architecture communicating via JSON over HTTP/S.
- **Third-Party Integrations:** Supabase JS v2.97 (Database & Storage), Bcrypt (Password Hashing), JSONWebToken (JWT Auth), Multer (File parsing).
- **Hosting/Cloud Provider (Recommended):** Vercel/Netlify for Angular (CDN delivery); Render/Railway/AWS ECS for Node.js API; Supabase Cloud for Database.

---

## 5. Database Design

### Database Schema Overview
The relational schema is highly normalized, revolving around a central `profiles` table to manage all human entities, with specialization tables for providers.

### ER Diagram Explanation
- `profiles` **(1) ---- (1)** `providers`: A 1-to-1 relationship. Every provider is a profile with specialized attributes (business name, category, pricing, verification status).
- `profiles` **(1) ---- (M)** `bookings (as customer)`: A customer can make multiple bookings.
- `providers` **(1) ---- (M)** `bookings (as provider)`: A provider can receive multiple bookings.

### Key Entities
1. **profiles:** `id (UUID)`, `email`, `role`, `password`, `phone`.
2. **providers:** `id (FK to profiles)`, `business_name`, `category`, `base_price`, `status`, `rating`.
3. **bookings:** `id`, `customer_id`, `provider_id`, `status`, `price`, `booking_date`.

### Indexing Strategy
- **Primary Keys:** Automatically indexed (e.g., `profiles.id`, `bookings.id`).
- **Foreign Keys:** Indexes should be applied to `customer_id` and `provider_id` in `bookings` for rapid join operations.
- **Searchable Text:** Indexes on `category` and `areas_served` in `providers` to optimize platform search functionalities.

---

## 6. Scalability & Performance

### Horizontal vs Vertical Scaling
- **Node.js API:** Exceptionally suited for **Horizontal Scaling**. Behind a load balancer (e.g., NGINX or AWS ALB), multiple instances of the Express app can run simultaneously.
- **Database:** PostgreSQL primarily scales **Vertically** (CPU/RAM). Connection pooling (via PgBouncer in Supabase) is critical to prevent connection exhaustion under high load.

### Caching Mechanisms
- **Client Caching:** Angular handles static asset caching locally in the browser.
- **Server Caching (Future Consideration):** Implementing Redis to cache frequently accessed data, such as the list of top-rated providers for a specific city.

### CDN Usage
All frontend compiled assets (JS, CSS) and uploaded media (Provider Photos, ID Proofs stored in Supabase Storage) should be served globally via a CDN to minimize latency and offload bandwidth from origin servers.

---

## 7. Security Design

### Authentication & Authorization
- **Authentication:** Custom JWT-based authentication. Users log in, receive a short-lived HTTP-only token (or secure LocalStorage token), and attach it to subsequent API requests.
- **Authorization:** Handled dually. The Express API checks roles (`admin` vs `provider`), and Supabase Row Level Security (RLS) ensures destructive DB operations are strictly limited (e.g., `UPDATE USING (auth.uid() = id)`).

### Data Encryption
- **In Transit:** All API and DB connections strictly enforced over HTTPS/TLS 1.2+.
- **At Rest:** PostgreSQL data and backups encrypted at rest by the cloud provider. Passwords are mathematically hashed using `bcrypt` before storage.

### API Security
- **CORS:** Configured to strictly accept requests only from trusted origins (`http://localhost:4200`, `http://localhost:4300`).
- **Input Validation:** Express controllers process and validate incoming payloads to mitigate SQL Injection and XSS attacks.

---

## 8. Reliability & Fault Tolerance

### Error Handling Strategy
- **Centralized Error Middleware:** The Node.js API utilizes a global `(err, req, res, next)` error handler to catch synchronous and asynchronous exception failures, preventing server crashes and returning standardized `500 Internal Server Error` JSON payloads rather than stack traces.

### Logging & Monitoring
- Basic `console.error` implemented for runtime logs.
- Need for integration with APM tools (e.g., Datadog, Sentry, New Relic) to track error rates and monitor API endpoint latencies in a production environment.

### Backup and Disaster Recovery
- Supabase provides automated daily automated backups with Point-in-Time Recovery (PITR) capabilities.

---

## 9. DevOps & Deployment

### CI/CD Pipeline Overview
A standard pipeline would involve GitHub Actions or GitLab CI triggering on pushes to `main`.
1. **Lint/Test Phase:** Runs `ng test` and Node.js unit tests.
2. **Build Phase:** Executes `ng build` for production artifacts.
3. **Deployment Phase:** Automatically pushes artifacts to the respective hosting platforms.

### Environment Strategy
- **Development (Dev):** Localhost configurations (`ng serve`, Node.js watch mode, local Supabase instance/dev project).
- **Quality Assurance (QA / Staging):** A mirror of production used for UAT (User Acceptance Testing) and integration tests.
- **Production (Prod):** Secure, scalable environment serving actual users.

### Containerization
The Node.js backend should be containerized using **Docker** (`Dockerfile`) to guarantee environmental consistency across developers' machines and production servers, easily orchestratable via Docker Compose or Kubernetes if complexity grows.

---

## 10. Future Improvements

### Potential Architectural Improvements
- **Microservices Migration:** If the platform scales massively, extracting the "Booking Engine" and "Payment Gateway" into standalone microservices communicating via gRPC or message queues (RabbitMQ/Kafka).
- **WebSockets:** Implementing `Socket.io` for real-time chat between Customers and Providers, and instant booking status updates.

### Scalability Enhancements
- **Redis Caching:** Introduce robust caching layers to circumvent repetitive DB querying for static provider profiles.
- **Elasticsearch:** Integrate advanced text-search capabilities for complex query filtering (e.g., "English speaking plumber available right now").

### Feature Roadmap Considerations
- **Integrated Payments:** Stripe or Razorpay integration to hold funds in escrow until a job is marked "Completed".
- **AI Matching Algorithm:** Implement a recommendation engine suggesting providers based on past booking success rates and contextual proximity.
- **Geospatial Queries:** Enhance PostGIS usage in PostgreSQL to filter providers strictly based on precise geographic radius matching rather than basic text areas.
