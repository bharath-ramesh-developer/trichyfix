import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule, SlicePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  providers: [SlicePipe, DatePipe],
  templateUrl: './provider-dashboard.html',
  styleUrl: './provider-dashboard.css'
})
export class ProviderDashboard implements OnInit, OnDestroy {
  activeTab: 'dashboard' | 'bookings' | 'earnings' | 'profile' | 'settings' = 'dashboard';
  provider: any = null;
  displayStats: any[] = [];
  recentBookings: any[] = [];
  allBookings: any[] = [];
  loading = false;
  error = '';
  private loadingTimeout: any;

  // Modal State
  selectedBooking: any = null;

  constructor(
    public auth: AuthService,
    private title: Title,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) { }

  ngOnInit() {
    this.title.setTitle('Provider Dashboard - TrichyFix');
    this.provider = this.auth.user();

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
        console.warn('[Provider] Data fetch timed out');
        this.loading = false;
        this.error = 'Syncing is taking longer than usual...';
        if (!this.displayStats || this.displayStats.length === 0) this.setFallbackStats();
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

  private setFallbackStats() {
    this.displayStats = [
      { label: 'Total Jobs', value: '--', icon: '📋', color: '#3B82F6', change: 'Connect to refresh' },
      { label: 'Rating', value: '4.5+', icon: '⭐', color: '#8B5CF6', change: 'Community Avg' }
    ];
    this.recentBookings = this.recentBookings || [];
    this.allBookings = this.allBookings || [];
    this.cdr.detectChanges();
  }

  async fetchDashboardData() {
    this.startLoading();
    this.error = '';
    try {
      const res = await this.auth.authFetch(`${environment.apiUrl}/providers/dashboard`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      this.zone.run(() => {
        if (data.success) {
          const stats = data.stats || {};
          this.displayStats = [
            { label: 'Total Jobs', value: stats.totalJobs || 0, icon: '📋', color: '#3B82F6', change: 'Lifetime jobs' },
            { label: 'Completed', value: stats.completedJobs || 0, icon: '✅', color: '#22C55E', change: 'Finished tasks' },
            { label: 'Monthly Earnings', value: `₹${(stats.monthlyEarnings || 0).toLocaleString()}`, icon: '💰', color: '#F5A623', change: 'Current month' },
            { label: 'Avg Rating', value: stats.avgRating || '0.0', icon: '⭐', color: '#8B5CF6', change: `${stats.reviews || 0} reviews` }
          ];
          this.recentBookings = data.recentBookings || [];
          this.allBookings = data.recentBookings || []; // Fallback, normally the separate fetch handles 'allBookings'
        }
      });
    } catch (err: any) {
      this.zone.run(() => {
        console.error('Provider Dashboard Error:', err);
        this.error = 'Unable to fetch live status. Check your connection.';
        if (!this.displayStats || this.displayStats.length === 0) this.setFallbackStats();
      });
    } finally {
      this.stopLoading();
    }
  }

  async fetchBookings() {
    this.startLoading();
    this.error = '';
    try {
      const res = await this.auth.authFetch(`${environment.apiUrl}/bookings/provider`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      this.zone.run(() => {
        if (data.success) {
          this.allBookings = data.bookings || [];
        }
      });
    } catch (err: any) {
      this.zone.run(() => {
        console.error('Provider Bookings fetch failed:', err);
        this.error = 'Failed to fetch the complete job history.';
      });
    } finally {
      this.stopLoading();
    }
  }

  async switchTab(tab: any) {
    this.activeTab = tab;
    this.error = '';
    this.cdr.detectChanges();
    if (tab === 'dashboard') {
      await this.fetchDashboardData();
    } else if (tab === 'bookings') {
      await this.fetchBookings();
    }
  }

  async updateBookingStatus(id: string, status: string) {
    const message = status === 'accepted' ? 'accept' : status === 'completed' ? 'mark as completed' : 'update';
    if (!confirm(`Are you sure you want to ${message} this booking?`)) return;

    try {
      const res = await this.auth.authFetch(`${environment.apiUrl}/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      this.zone.run(() => {
        if (data.success) {
          if (this.selectedBooking && this.selectedBooking.id === id) {
            this.selectedBooking.status = status; // Update modal instantly if open
          }
          if (this.activeTab === 'bookings') this.fetchBookings();
          else this.fetchDashboardData();
        }
      });
    } catch (err) {
      this.zone.run(() => {
        alert('Failed to update booking status');
      });
    }
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'pending': 'badge-pending',
      'accepted': 'badge-verified',
      'in-progress': 'badge-emergency',
      'completed': 'badge-available',
      'cancelled': 'badge-busy'
    };
    return map[status] || '';
  }

  viewBookingDetails(booking: any) {
    this.selectedBooking = booking;
    this.cdr.detectChanges();
  }

  closeBookingDetails() {
    this.selectedBooking = null;
    this.cdr.detectChanges();
  }
}
