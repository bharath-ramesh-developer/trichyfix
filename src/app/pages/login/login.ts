import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  password = '';
  showPassword = false;
  loginMode: 'password' | 'forgot-password' = 'password';
  phone = '';
  otp = '';
  loading = false;
  errorMsg = '';
  successMsg = '';

  // OTP state
  otpSent = false;
  otpTimer = 0;
  otpInterval: any = null;

  // Snackbar UI
  snackbarVisible = false;
  snackbarMessage = '';
  snackbarType: 'success' | 'error' | 'warning' = 'error';

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
    this.title.setTitle('Login - TrichyFix');
    this.meta.updateTag({ name: 'description', content: 'Securely login to TrichyFix to book home services, manage your provider profile or view bookings.' });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  switchMode(mode: 'password' | 'forgot-password') {
    this.loginMode = mode;
    this.errorMsg = '';
    this.successMsg = '';
    this.otpSent = false;
    this.password = ''; // clear password buffer
    this.clearTimer();
    this.cdr.detectChanges();
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

  async onLogin() {
    if (this.loginMode === 'password') {
      if (!this.phone || !this.password) {
        this.errorMsg = 'Please fill in all fields';
        return;
      }
      this.loading = true;
      this.errorMsg = '';
      this.cdr.detectChanges();

      const result = await this.auth.login(this.phone, this.password);
      this.loading = false;

      if (result.success) {
        this.successMsg = result.message;
        setTimeout(() => {
          const role = this.auth.userRole();
          if (role === 'admin') this.router.navigate(['/admin']);
          else if (role === 'provider') this.router.navigate(['/provider/dashboard']);
          else this.router.navigate(['/']);
        }, 500);
      } else {
        this.errorMsg = result.message;
      }
      this.cdr.detectChanges();
    }
  }

  async sendOTP() {
    if (!this.phone || this.phone.length < 10) {
      this.errorMsg = 'Enter a valid phone number';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    const result = await this.auth.sendOTP(this.phone, 'forgot_password');
    this.loading = false;

    if (result.success) {
      this.otpSent = true;
      this.successMsg = 'OTP sent to ' + this.phone;
      this.showSnackbar('OTP sent successfully', 'success');
      this.startTimer();
      if (result.devOTP) {
        this.otp = result.devOTP;
      }
    } else {
      this.errorMsg = result.message;
      this.showSnackbar(result.message, 'error');
    }
    this.cdr.detectChanges();
  }

  async verifyAndResetPassword() {
    if (!this.otp || this.otp.length < 4) {
      this.errorMsg = 'Enter a valid 4-digit OTP';
      return;
    }
    if (!this.password || this.password.length < 6) {
      this.errorMsg = 'Enter a new password (min 6 characters)';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    const result = await this.auth.resetPassword(this.phone, this.otp, this.password);
    this.loading = false;

    if (result.success) {
      this.successMsg = 'Password reset successful!';
      this.showSnackbar('Password reset successful!', 'success');
      setTimeout(() => {
        this.switchMode('password');
      }, 1500);
    } else {
      this.errorMsg = result.message;
      this.showSnackbar(result.message, 'error');
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
    this.otp = '';
    this.sendOTP();
  }
}
