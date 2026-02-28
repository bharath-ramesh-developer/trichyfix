import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-book-service',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './book-service.html',
  styleUrl: './book-service.css'
})
export class BookService implements OnInit {
  providerId: any;
  provider: any = null;
  loading = true;
  bookingLoading = false;
  error = '';

  selectedDate = '';
  selectedTime = '';
  issueDescription = '';
  detailedAddress = '';
  isEmergency = false;

  timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM'
  ];

  todayDate = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private title: Title,
    private meta: Meta,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.providerId = params['id'];
      this.fetchProvider();
    });

    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];

    // SEO
    this.title.setTitle('Book Service - TrichyFix');
    this.meta.updateTag({ name: 'description', content: 'Book verified professionals in Trichy for home services. Fast booking, reliable experts.' });
  }

  async fetchProvider() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const res = await fetch(`http://localhost:3000/api/providers/${this.providerId}`);
      const data = await res.json();
      if (data.success) {
        this.provider = data.provider;
        this.title.setTitle(`Book ${this.provider.name} - TrichyFix`);
      } else {
        this.error = 'Provider not found';
      }
    } catch (err) {
      this.error = 'Failed to load provider details';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  selectTime(time: string) {
    this.selectedTime = time;
  }

  async submitBooking() {
    if (!this.selectedDate || !this.selectedTime || !this.issueDescription || !this.detailedAddress) {
      alert('Please fill in all required fields');
      return;
    }

    if (this.detailedAddress.length < 30) {
      alert('Detailed Address must be at least 30 characters long');
      return;
    }

    if (!this.auth.isLoggedIn()) {
      alert('Please login to book a service');
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.bookingLoading = true;
    this.cdr.detectChanges();

    try {
      const payload = {
        providerId: this.providerId,
        date: this.selectedDate,
        time: this.selectedTime,
        description: this.issueDescription,
        address: this.detailedAddress,
        isEmergency: this.isEmergency
      };

      const res = await this.auth.authFetch('http://localhost:3000/api/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        this.router.navigate(['/booking-confirmed'], { state: { booking: data.booking } });
      } else {
        alert(data.message || 'Booking failed. Please try again.');
      }
    } catch (err) {
      alert('An error occurred. Please check your connection.');
    } finally {
      this.bookingLoading = false;
      this.cdr.detectChanges();
    }
  }
}
