import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  providers: [TitleCasePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit, OnDestroy {
  /** The currently active view tab inside the admin panel UI */
  activeTab: 'dashboard' | 'providers' | 'verification' | 'bookings' | 'users' | 'settings' | 'rejected' = 'dashboard';

  /** Global UI state flag blocking interaction while API background synchronization runs */
  loading = false;

  /** Stores runtime error strings for UI banner display in case of fetch failures */
  error = '';

  /** Internally tracks asynchronous timer handles to gracefully abort endless loaders */
  private loadingTimeout: any;

  // Stats & Dashboard Data
  /** Aggregated numerical KPI blocks dynamically rendered across the top panel */
  stats: any[] = [];
  /** Short Array containing the most recent chronologically ordered booking records */
  recentBookings: any[] = [];
  /** Target Array caching Service Providers explicitly restricted waiting for Admin manual approval */
  pendingProviders: any[] = [];

  // Data Lists
  /** Global unordered cache array tracking every single provider attached to the platform */
  allProviders: any[] = [];
  /** Global unordered cache array tracking every single booked transaction attached to the platform */
  allBookings: any[] = [];
  /** Global unordered cache array resolving all generic customer roles and profiles */
  allUsers: any[] = [];

  // Filters
  /** Live Two-Way Binding search string intercepting filtering logic dynamically */
  searchQuery = '';
  /** State enumeration controlling table segmentations (e.g., 'active', 'suspended', 'all') */
  filterStatus = 'all';

  // Modal State
  selectedProvider: any = null;

  /**
   * Initializes structural dependencies natively injected by DI Framework
   * @param auth Native authorization protocol manager mapping API security headers
   * @param title Angular DOM title injector specifically managing SEO
   * @param route Current active URL Route inspector mapping query params to tabs
   * @param cdr Native ChangeDetectorRef explicitly forcing UI component refreshes outside usual cycles
   * @param zone Optimization sandbox wrapper forcing execution inside Angular's primary digestion pipeline
   */
  constructor(
    public auth: AuthService,
    private title: Title,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) { }

  ngOnInit() {
    this.title.setTitle('Admin Panel - TrichyFix');

    const currentPath = window.location.pathname;
    if (currentPath.includes('/admin/verification')) {
      this.activeTab = 'verification';
    }

    this.route.queryParams.subscribe(params => {
      const targetTab = params['tab'];
      if (targetTab) {
        this.switchTab(targetTab);
      } else {
        this.switchTab(this.activeTab);
      }
    });
  }

  ngOnDestroy() {
    this.clearLoadingTimeout();
  }

  private startLoading() {
    this.loading = true;
    this.cdr.detectChanges();
    this.clearLoadingTimeout();
    this.loadingTimeout = setTimeout(() => {
      if (this.loading) {
        console.warn('[Admin] Data fetch timed out');
        this.loading = false;
        this.error = 'Connection slow or server unresponsive. Showing cached/mock data.';
        if (!this.stats || this.stats.length === 0) this.setFallbackStats();
        this.cdr.detectChanges();
      }
    }, 8000);
  }

  private stopLoading() {
    this.zone.run(() => {
      this.loading = false;
      this.clearLoadingTimeout();
      this.cdr.detectChanges();
    });
  }

  private clearLoadingTimeout() {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }
  }

  async fetchDashboardData() {
    this.startLoading();
    this.error = '';
    try {
      const res = await this.auth.authFetch(`${environment.apiUrl}/admin/stats`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      this.zone.run(() => {
        if (data.success) {
          this.stats = data.stats || [];
          this.recentBookings = data.recentBookings || [];
          this.pendingProviders = data.pendingProviders || [];
        } else {
          this.error = data.message || 'Error loading dashboard';
        }
      });
    } catch (err: any) {
      this.zone.run(() => {
        console.error('Admin Dashboard Error:', err);
        this.error = 'Live sync failed. Showing fallback data.';
        this.setFallbackStats();
      });
    } finally {
      this.stopLoading();
    }
  }

  private setFallbackStats() {
    this.stats = [
      { label: 'Total Users', value: '1,204', icon: '👥', color: '#8B5CF6', change: 'Cached' },
      { label: 'Active Providers', value: '52', icon: '👨‍🔧', color: '#3B82F6', change: 'Offline' },
      { label: 'Total Bookings', value: '247', icon: '📅', color: '#22C55E', change: 'Manual' },
      { label: 'Revenue', value: '₹42,500', icon: '💰', color: '#F5A623', change: 'Approx' }
    ];
    this.recentBookings = this.recentBookings || [];
    this.pendingProviders = this.pendingProviders || [];
    this.cdr.detectChanges();
  }

  async switchTab(tab: any) {
    this.activeTab = tab;
    this.searchQuery = '';
    this.filterStatus = 'all';
    this.error = '';
    this.cdr.detectChanges();

    try {
      if (tab === 'dashboard') await this.fetchDashboardData();
      else if (tab === 'providers' || tab === 'verification' || tab === 'rejected') await this.fetchAllProviders();
      else if (tab === 'bookings') await this.fetchAllBookings();
      else if (tab === 'users') await this.fetchAllUsers();
    } catch (err) {
      this.stopLoading();
    }
  }

  async fetchAllProviders() {
    this.startLoading();
    try {
      const res = await this.auth.authFetch(`${environment.apiUrl}/admin/providers`);
      if (!res.ok) throw new Error('Providers not available');
      const data = await res.json();
      if (data.success) {
        this.zone.run(() => {
          this.allProviders = data.providers || [];
        });
        // Force refresh pending providers every time if we are actively viewing the verification tab
        if (this.activeTab === 'verification' || this.activeTab === 'dashboard') {
          const sRes = await this.auth.authFetch(`${environment.apiUrl}/admin/stats`);
          const sData = await sRes.json();
          this.zone.run(() => {
            if (sData.success) this.pendingProviders = sData.pendingProviders || [];
          });
        }
      }
    } catch (err) {
      this.zone.run(() => {
        this.error = 'Unable to load providers list';
      });
    } finally {
      this.stopLoading();
    }
  }

  async fetchAllBookings() {
    this.startLoading();
    try {
      const res = await this.auth.authFetch(`${environment.apiUrl}/admin/bookings`);
      if (!res.ok) throw new Error('Booking service error');
      const data = await res.json();
      this.zone.run(() => {
        if (data.success) {
          this.allBookings = data.bookings || [];
        }
      });
    } catch (err) {
      this.zone.run(() => {
        this.error = 'Failed to load bookings database';
      });
    } finally {
      this.stopLoading();
    }
  }

  async fetchAllUsers() {
    this.startLoading();
    try {
      const res = await this.auth.authFetch(`${environment.apiUrl}/admin/users`);
      if (!res.ok) throw new Error('User service error');
      const data = await res.json();
      this.zone.run(() => {
        if (data.success) {
          this.allUsers = data.users || [];
        }
      });
    } catch (err) {
      this.zone.run(() => {
        this.error = 'Failed to load user records';
      });
    } finally {
      this.stopLoading();
    }
  }

  async updateProviderStatus(id: string, status: string) {
    const action = status === 'active' ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${action} this provider?`)) return;

    try {
      const res = await this.auth.authFetch(`${environment.apiUrl}/admin/providers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      this.zone.run(() => {
        if (data.success) {
          // Instantly evict from pending list locally for snappy UI response
          this.pendingProviders = this.pendingProviders.filter(p => p.id !== id);

          // If we are currently inside the dashboard list, manually evict as well to avoid reloading full dashboard
          if (this.activeTab === 'dashboard') {
            this.cdr.detectChanges();
          } else {
            this.switchTab(this.activeTab); // Let switchTab gracefully handle everything else
          }
        } else {
          alert('Error: ' + data.message);
        }
      });
    } catch (err) {
      this.zone.run(() => {
        alert('Failed to update status');
      });
    }
  }

  get filteredProviders() {
    let providers = this.activeTab === 'verification' ? this.pendingProviders : this.allProviders;
    if (!providers) return [];

    // Separate Rejected view strictly scopes for 'suspended'/'rejected' entries natively
    if (this.activeTab === 'rejected') {
      providers = providers.filter(p => p.status === 'suspended' || p.status === 'rejected');
    } else if (this.activeTab === 'providers' && this.filterStatus === 'all') {
      // Typically main providers page shouldn't heavily muddy rejected in 'All', but we'll leave it strictly unfiltered for true "All" 
      // or optionally enforce `status !== 'suspended'` based on preference.
    }

    if (this.filterStatus !== 'all' && this.activeTab !== 'rejected') {
      providers = providers.filter(p => p.status === this.filterStatus);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      providers = providers.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q)));
    }
    return providers;
  }

  get filteredBookings() {
    let filtered = this.allBookings ? [...this.allBookings] : [];
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        (b.id && b.id.toLowerCase().includes(q)) ||
        (b.customerName && b.customerName.toLowerCase().includes(q)) ||
        (b.providerName && b.providerName.toLowerCase().includes(q))
      );
    }
    return filtered;
  }

  openProviderDetails(provider: any) {
    this.selectedProvider = provider;
    this.cdr.detectChanges();
  }

  closeProviderDetails() {
    this.selectedProvider = null;
    this.cdr.detectChanges();
  }
}
