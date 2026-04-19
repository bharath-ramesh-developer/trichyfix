import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-register-customer',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './register-customer.html',
  styleUrl: './register-customer.css'
})
export class RegisterCustomer implements OnInit {
  firstName = '';
  lastName = '';
  phone = '';
  password = '';
  area = '';
  showPassword = false;
  agreeTerms = false;
  loading = false;
  errorMsg = '';

  // OTP State
  otpSent = false;
  otpVerified = false;
  otpCode = '';
  otpTimer = 0;
  otpInterval: any = null;
  otpError = '';
  otpLoading = false;

  // Snackbar UI Core
  snackbarVisible = false;
  snackbarMessage = '';
  snackbarType: 'success' | 'error' | 'warning' = 'error';

  areas = ['KK Nagar', 'Srirangam', 'Thillai Nagar', 'Woraiyur', 'Cantonment', 'Puthur', 'Tennur', 'Crawford', 'Karumandapam'];

  private apiUrl = 'https://trichyfix-backend-1-0.onrender.com/api';

  allowOnlyNumbers(event: any) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
    }
  }

  onPaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text') || '';
    if (!/^\d+$/.test(text)) {
      event.preventDefault();
    }
  }

  constructor(
    private router: Router,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private title: Title,
    private meta: Meta
  ) { }

  ngOnInit() {
    this.title.setTitle('Customer Registration - TrichyFix');
    this.meta.updateTag({ name: 'description', content: 'Create a customer account to easily book home services across Trichy.' });
  }

  showSnackbar(message: string, type: 'success' | 'error' | 'warning' = 'error') {
    this.snackbarMessage = message;
    this.snackbarType = type;
    this.snackbarVisible = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.snackbarVisible = false;
      this.cdr.detectChanges();
    }, 4000);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async sendOTP() {
    if (!this.phone || this.phone.length < 10) {
      this.otpError = 'Enter a valid phone number';
      return;
    }
    this.otpLoading = true;
    this.otpError = '';
    this.cdr.detectChanges();

    const result = await this.auth.sendOTP(this.phone, 'register', 'customer');
    this.otpLoading = false;

    if (result.success) {
      this.otpSent = true;
      this.startTimer();
      if (result.devOTP) {
        this.otpCode = result.devOTP;
      }
    } else {
      this.otpError = result.message;
      this.showSnackbar(result.message, 'error');
    }
    this.cdr.detectChanges();
  }

  async verifyOTP() {
    if (!this.otpCode || this.otpCode.length < 4) {
      this.otpError = 'Enter a valid 4-digit OTP';
      return;
    }
    this.otpLoading = true;
    this.otpError = '';
    this.cdr.detectChanges();

    const result = await this.auth.verifyOTP(this.phone, this.otpCode, 'register');
    this.otpLoading = false;

    if (result.success) {
      this.otpVerified = true;
      this.clearTimer();
    } else {
      this.otpError = result.message;
    }
    this.cdr.detectChanges();
  }

  startTimer() {
    this.otpTimer = 60;
    this.clearTimer();
    this.otpInterval = setInterval(() => {
      this.otpTimer--;
      if (this.otpTimer <= 0) this.clearTimer();
      this.cdr.detectChanges();
    }, 1000);
  }

  clearTimer() {
    if (this.otpInterval) {
      clearInterval(this.otpInterval);
      this.otpInterval = null;
    }
    this.cdr.detectChanges();
  }

  resendOTP() {
    this.otpCode = '';
    this.sendOTP();
  }

  async onRegister() {
    this.errorMsg = '';

    if (!this.firstName || !this.phone || !this.password || !this.area) {
      this.errorMsg = 'Please fill in all required fields';
      return;
    }
    if (!this.otpVerified) {
      this.errorMsg = 'Please verify your phone number with OTP first';
      return;
    }
    if (!this.agreeTerms) {
      this.errorMsg = 'Please agree to the Terms of Service';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    try {
      const res = await fetch(`${this.apiUrl}/auth/register/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: this.firstName,
          lastName: this.lastName,
          phone: this.phone,
          password: this.password,
          area: this.area
        })
      });
      const data = await res.json();
      this.loading = false;

      if (data.success) {
        if (data.token && data.user) {
          this.auth.setSession(data.token, data.refreshToken, data.user);
        }
        this.router.navigate(['/registration-success'], { queryParams: { type: 'customer' } });
      } else {
        this.errorMsg = data.message;
      }
    } catch {
      this.loading = false;
      this.errorMsg = 'Unable to connect to server. Please try again.';
    } finally {
      this.cdr.detectChanges();
    }
  }
}
