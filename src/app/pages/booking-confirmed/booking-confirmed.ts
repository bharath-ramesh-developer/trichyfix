import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Title } from '@angular/platform-browser';

@Component({
    selector: 'app-booking-confirmed',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './booking-confirmed.html',
    styleUrl: './booking-confirmed.css'
})
export class BookingConfirmed implements OnInit {
    booking: any = null;
    showToast = false;

    constructor(private router: Router, private title: Title) {
        const nav = this.router.getCurrentNavigation();
        if (nav?.extras?.state?.['booking']) {
            this.booking = nav.extras.state['booking'];
        }
    }

    ngOnInit() {
        if (!this.booking) {
            // Fallback mock if data is missing
            this.booking = {
                id: 'TF-1024',
                providerName: 'Murugan Electricals',
                providerCategory: 'Electrician',
                date: new Date().toISOString().split('T')[0],
                time: '10:00 AM',
                status: 'pending'
            };
        }

        this.title.setTitle('Booking Confirmed - TrichyFix');

        // Show toast animation
        setTimeout(() => { this.showToast = true; }, 500);
        setTimeout(() => { this.showToast = false; }, 5000);
    }
}
