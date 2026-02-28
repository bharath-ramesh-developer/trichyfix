import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    // Replace these with your actual Supabase project credentials
    private supabaseUrl = 'https://your-project-url.supabase.co';
    private supabaseKey = 'your-anon-key';

    constructor() {
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    }

    get client(): SupabaseClient {
        return this.supabase;
    }

    get auth() {
        return this.supabase.auth;
    }

    // Example: Generic query helper
    async from(table: string) {
        return this.supabase.from(table);
    }
}
