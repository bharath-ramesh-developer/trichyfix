import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: 'admin' | 'provider' | 'customer';
    area: string;
    phoneVerified: boolean;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    token?: string;
    refreshToken?: string;
    user?: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    /** The base URL endpoint for all backend authentication API calls */
    private readonly API_URL = 'http://localhost:3000/api';
    /** LocalStorage key used to store the active JWT authentication string */
    private readonly TOKEN_KEY = 'trichyfix_token';
    /** LocalStorage key used to store the secondary Refresh JWT Token string */
    private readonly REFRESH_TOKEN_KEY = 'trichyfix_refresh_token';
    /** LocalStorage key used to store stringified cached JSON user model */
    private readonly USER_KEY = 'trichyfix_user';

    // Reactive signals for auth state

    /** Internal Angular Signal holding the active user profile model loaded from local cache */
    private _user = signal<User | null>(this.loadStoredUser());

    /** Internal Angular Signal tracking the live JWT session token String */
    private _token = signal<string | null>(this.loadStoredToken());

    /** Read-only external observable for components tracking the live user state */
    readonly user = this._user.asReadonly();
    /** Computed property evaluating true if both the user model and security token exist synchronously */
    readonly isLoggedIn = computed(() => !!this._user() && !!this._token());
    /** Dynamically derives the 'customer', 'provider', or 'admin' string classification role */
    readonly userRole = computed(() => this._user()?.role ?? null);
    /** Short-circuit computed flag explicitly identifying Super Admin elevation privileges */
    readonly isAdmin = computed(() => this._user()?.role === 'admin');
    /** Short-circuit computed flag explicitly identifying independent Service Provider accounts */
    readonly isProvider = computed(() => this._user()?.role === 'provider');
    /** Short-circuit computed flag identifying standard default customer access clients */
    readonly isCustomer = computed(() => this._user()?.role === 'customer');
    readonly userName = computed(() => {
        const u = this._user();
        if (!u) return '';
        const first = u.firstName || (u as any).first_name || '';
        const last = u.lastName || (u as any).last_name || '';
        return `${first} ${last}`.trim();
    });
    readonly userInitial = computed(() => {
        const u = this._user();
        // Check for both camelCase and snake_case variations depending on how the backend mapped it
        const name = u ? (u.firstName || (u as any).first_name || '') : '';
        return name ? name.charAt(0).toUpperCase() : '?';
    });

    constructor(private router: Router) { }

    // ── Load from localStorage ──────────────────────────────────

    /**
     * Initializes the Angular Signal Bootstrapper by defensively scanning 
     * the browser's persistent generic local storage for any previously cached 
     * user session structures, parsing them if they haven't explicitly logged out yet.
     * @returns {User | null} Standard structured JSON User array or null.
     */
    private loadStoredUser(): User | null {
        try {
            const raw = localStorage.getItem(this.USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    /**
     * Retrieves the cryptographic JWT generated during the previous session login request.
     * @returns {string | null} The raw Base64 token schema or null.
     */
    private loadStoredToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    private loadStoredRefreshToken(): string | null {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }

    // ── Login with mobile/password ───────────────────────────────

    /**
     * Executes the primary active directory resolution by taking the mobile sequence
     * and hitting the Node.JS /api/auth/login endpoint securely.
     * @param phone Registered active mobile 10-digit number
     * @param password Unhashed string parameter matching database records
     * @returns {Promise<LoginResponse>} A mapped Promise tracking security feedback messages and token drops.
     */
    async login(phone: string, password: string): Promise<LoginResponse> {
        try {
            const res = await fetch(`${this.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });
            const data = await res.json();

            if (data.success && data.token && data.user) {
                this.setSession(data.token, data.refreshToken, data.user);
            }
            return data;
        } catch {
            return { success: false, message: 'Unable to connect to server' };
        }
    }

    // ── Login with OTP ──────────────────────────────────────────
    async loginWithOTP(phone: string, otp: string): Promise<LoginResponse> {
        try {
            const res = await fetch(`${this.API_URL}/auth/login/otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp })
            });
            const data = await res.json();

            if (data.success && data.token && data.user) {
                this.setSession(data.token, data.refreshToken, data.user);
            }
            return data;
        } catch {
            return { success: false, message: 'Unable to connect to server' };
        }
    }

    // ── Send OTP ────────────────────────────────────────────────
    async sendOTP(phone: string, purpose: 'login' | 'register' | 'forgot_password'): Promise<{ success: boolean; message: string; devOTP?: string }> {
        try {
            const res = await fetch(`${this.API_URL}/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, purpose })
            });
            return await res.json();
        } catch {
            return { success: false, message: 'Unable to connect to server' };
        }
    }

    // ── Verify OTP ──────────────────────────────────────────────
    async verifyOTP(phone: string, otp: string, purpose?: string): Promise<{ success: boolean; message: string }> {
        try {
            const res = await fetch(`${this.API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp, purpose })
            });
            return await res.json();
        } catch {
            return { success: false, message: 'Unable to connect to server' };
        }
    }

    // ── Reset Password ──────────────────────────────────────────
    async resetPassword(phone: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        try {
            const res = await fetch(`${this.API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, otp, newPassword })
            });
            return await res.json();
        } catch {
            return { success: false, message: 'Unable to connect to server' };
        }
    }

    // ── Session management ──────────────────────────────────────

    /**
     * Native sequence invoked by Authentication blocks successfully resolving login checks.
     * Caches references into the active storage and injects state into Reactive Angular signals.
     * @param token Active Backend Security API JSON Token Identifier
     * @param user Explicit structured user identity payload matrix
     */
    setSession(token: string, refreshToken: string | undefined, user: User) {
        localStorage.setItem(this.TOKEN_KEY, token);
        if (refreshToken) {
            localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
        }
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this._token.set(token);
        this._user.set(user);
    }

    /**
     * Completely eradicates local persistence objects and destroys browser references 
     * for the cache. Forcibly drops the current angular view to the primary '/login' index route 
     * guarding isolated pages safely.
     */
    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        this._token.set(null);
        this._user.set(null);
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return this._token();
    }

    // ── Fetch with auth header ──────────────────────────────────
    async authFetch(url: string, options: RequestInit = {}): Promise<Response> {
        const token = this.getToken();
        const headers: any = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        let response = await fetch(url, { ...options, headers });

        // --- REFRESH TOKEN INTERCEPTOR ---
        if (response.status === 401 || response.status === 403) {
            const refreshToken = this.loadStoredRefreshToken();
            if (refreshToken) {
                const refreshRes = await fetch(`${this.API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                });

                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    if (data.success && data.token) {
                        // Resync storage locally
                        localStorage.setItem(this.TOKEN_KEY, data.token);
                        this._token.set(data.token);

                        // Retry the original query
                        headers['Authorization'] = `Bearer ${data.token}`;
                        response = await fetch(url, { ...options, headers });
                    } else {
                        this.logout();
                    }
                } else {
                    this.logout();
                }
            } else {
                this.logout();
            }
        }

        return response;
    }
}
