import { Component, NgZone, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface Notification {
  id: number;
  type: 'booking' | 'status' | 'review' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  bookingId?: string;
  actionRequired?: boolean;
}

@Component({
  selector: 'app-provider-notifications',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './provider-notifications.html',
  styleUrl: './provider-notifications.css'
})
export class ProviderNotifications implements OnInit {
  activeTab: 'all' | 'bookings' | 'reviews' | 'system' = 'all';

  constructor(private auth: AuthService, private zone: NgZone) { }

  ngOnInit() {
    this.fetchLiveBookings();
  }

  async fetchLiveBookings() {
    try {
      const res = await this.auth.authFetch(`${environment.apiUrl}/bookings/provider`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && data.bookings) {
        this.zone.run(() => {
          // Filter out existing mock bookings to replace with live ones
          const otherNotifications = this.notifications.filter(n => n.type !== 'booking' && n.type !== 'status');

          const liveNotifications: Notification[] = data.bookings.map((b: any, index: number) => {
            const isPending = b.status === 'pending';
            return {
              id: 1000 + index, // Dynamic ID
              type: 'booking',
              title: isPending ? 'New Booking Request' : `Booking ${b.status.charAt(0).toUpperCase() + b.status.slice(1)}`,
              message: isPending
                ? `${b.customerName || 'A customer'} has requested ${b.description || 'a service'} on ${b.date} at ${b.time}`
                : `Booking ${b.id} is currently ${b.status}.`,
              time: 'Just now', // Placeholder since real time relative calculation requires date-fns or similar
              read: b.status !== 'pending',
              bookingId: b.id,
              actionRequired: isPending
            };
          });

          this.notifications = [...liveNotifications, ...otherNotifications];
        });
      }
    } catch (err) {
      console.error('Failed to load live notification bookings', err);
    }
  }

  notifications: Notification[] = [
    { id: 1, type: 'booking', title: 'New Booking Request', message: 'Priya Sundaram has requested Fan Installation in KK Nagar on 20 Feb at 10:00 AM', time: '2 min ago', read: false, bookingId: 'TF-1024', actionRequired: true },
    { id: 2, type: 'booking', title: 'New Booking Request', message: 'Rajesh Kumar needs Wiring Repair in Srirangam on 20 Feb at 02:00 PM', time: '15 min ago', read: false, bookingId: 'TF-1025', actionRequired: true },
    { id: 3, type: 'status', title: 'Booking Completed', message: 'Booking TF-1021 has been marked as completed. Great work!', time: '1 hour ago', read: true },
    { id: 4, type: 'review', title: 'New Review Received', message: 'Kumar S. gave you a 5-star rating: "Excellent work, very professional!"', time: '2 hours ago', read: true },
    { id: 5, type: 'system', title: 'Profile Verified', message: 'Your profile has been verified by the admin team. You can now receive bookings.', time: '1 day ago', read: true },
    { id: 6, type: 'booking', title: 'Booking Cancelled', message: 'Anita Devi cancelled the booking TF-1019 for MCB Replacement.', time: '1 day ago', read: true },
    { id: 7, type: 'system', title: 'Monthly Earnings Report', message: 'Your January 2026 earnings report is ready. Total: ₹32,800', time: '2 days ago', read: true },
    { id: 8, type: 'review', title: 'New Review Received', message: 'Lakshmi P. gave you a 4-star rating: "Good service, arrived on time."', time: '3 days ago', read: true }
  ];

  get filteredNotifications(): Notification[] {
    if (this.activeTab === 'all') return this.notifications;
    if (this.activeTab === 'bookings') return this.notifications.filter(n => n.type === 'booking');
    if (this.activeTab === 'reviews') return this.notifications.filter(n => n.type === 'review');
    return this.notifications.filter(n => n.type === 'system');
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = { 'booking': '📅', 'status': '✅', 'review': '⭐', 'system': '🔔' };
    return map[type] || '🔔';
  }

  markAsRead(id: number) {
    const n = this.notifications.find(n => n.id === id);
    if (n) n.read = true;
  }

  async acceptFromNotification(id: number) {
    const n = this.notifications.find(n => n.id === id);
    if (!n || !n.bookingId) return;

    try {
      const res = await this.auth.authFetch(`${environment.apiUrl}/bookings/${n.bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'accepted' })
      });
      const data = await res.json();
      this.zone.run(() => {
        if (data.success || res.status === 404) { // Allow UI mock data to proceed
          this.markAsRead(id);
          n.actionRequired = false;
          alert(res.status === 404 ? 'Booking accepted! (Simulated for UI Mock Data)' : 'Booking accepted!');
        } else {
          alert('Error: ' + data.message);
        }
      });
    } catch (err) {
      this.zone.run(() => alert('Failed to connect to the server'));
    }
  }

  async declineFromNotification(id: number) {
    const n = this.notifications.find(n => n.id === id);
    if (!n || !n.bookingId) return;

    try {
      const res = await this.auth.authFetch(`${environment.apiUrl}/bookings/${n.bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' })
      });
      const data = await res.json();
      this.zone.run(() => {
        if (data.success || res.status === 404) { // Allow UI mock data to proceed
          this.markAsRead(id);
          n.actionRequired = false;
          alert(res.status === 404 ? 'Booking declined. (Simulated for UI Mock Data)' : 'Booking declined.');
        } else {
          alert('Error: ' + data.message);
        }
      });
    } catch (err) {
      this.zone.run(() => alert('Failed to connect to the server'));
    }
  }

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
  }
}
