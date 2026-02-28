import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { FilterPipe } from '../../pipes/filter.pipe';

@Component({
    selector: 'app-customer-bookings',
    standalone: true,
    imports: [RouterLink, CommonModule, FormsModule, FilterPipe],
    providers: [DatePipe],
    templateUrl: './customer-bookings.html',
    styleUrl: './customer-bookings.css'
})
export class CustomerBookings implements OnInit {
    bookings: any[] = [];
    loading = true;
    error = '';
    activeFilter: 'all' | 'ongoing' | 'completed' = 'all';
    ratingBookingId: string | null = null;

    constructor(
        public auth: AuthService,
        private title: Title,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.title.setTitle('My Bookings - TrichyFix');
        this.fetchBookings();
    }

    async fetchBookings() {
        this.loading = true;
        this.error = '';
        this.cdr.detectChanges();

        try {
            const res = await this.auth.authFetch('http://localhost:3000/api/bookings/customer');
            const data = await res.json();

            if (data.success) {
                this.bookings = data.bookings;
            } else {
                this.error = data.message || 'Failed to load bookings';
            }
        } catch (err) {
            this.error = 'Unable to connect to server. Please check your connection.';
        } finally {
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    get filteredBookings() {
        if (this.activeFilter === 'ongoing') {
            return this.bookings.filter(b => ['pending', 'accepted', 'in-progress'].includes(b.status));
        }
        if (this.activeFilter === 'completed') {
            return this.bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');
        }
        return this.bookings;
    }

    getStatusClass(status: string): string {
        const map: Record<string, string> = {
            'pending': 'status-pending',
            'accepted': 'status-accepted',
            'in-progress': 'status-progress',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        return map[status] || '';
    }

    async submitRating(bookingId: string, ratingNum: number) {
        try {
            const res = await this.auth.authFetch(`http://localhost:3000/api/bookings/${bookingId}/rate`, {
                method: 'POST',
                body: JSON.stringify({ rating: ratingNum, review: '' })
            });
            const data = await res.json();
            if (data.success) {
                this.ratingBookingId = null;
                this.fetchBookings();
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert('Failed to submit rating');
        }
    }
}
