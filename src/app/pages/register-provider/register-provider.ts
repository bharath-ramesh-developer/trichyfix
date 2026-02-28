import { Component, OnDestroy, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-register-provider',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './register-provider.html',
  styleUrl: './register-provider.css'
})
export class RegisterProvider implements OnInit, OnDestroy {
  currentStep = 1;
  totalSteps = 3;

  // Step 1: Personal Information
  fullName = '';
  phone = '';
  password = '';
  showPassword = false;
  experience = '';

  // OTP
  otpSent = false;
  otpVerified = false;
  otpCode = '';
  otpTimer = 0;
  otpInterval: any = null;
  otpError = '';
  otpLoading = false;

  // Step 2: Service Details
  selectedCategories: string[] = [];
  selectedAreas: string[] = [];
  priceMin = '';
  priceMax = '';
  emergencyAvailable = false;

  categories = ['Electrician', 'Plumber', 'AC Repair', 'Appliance Repair', 'Painting', 'Carpentry'];
  areas = ['KK Nagar', 'Srirangam', 'Thillai Nagar', 'Woraiyur', 'Cantonment', 'Puthur', 'Tennur', 'Crawford', 'Karumandapam'];

  // Step 3: Verification & ID Proof
  idProofType = '';
  idProof: File | null = null;
  profilePhoto: File | null = null;
  aboutBio = '';
  agreeTerms = false;

  idProofTypes = ['Aadhaar Card', 'Driving License', 'Voter ID', 'Passport'];

  loading = false;
  errorMsg = '';

  // Snackbar UI Core
  snackbarVisible = false;
  snackbarMessage = '';
  snackbarType: 'success' | 'error' | 'warning' = 'error';

  private apiUrl = 'http://localhost:3000/api';

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
    this.title.setTitle('Register as a Provider - TrichyFix');
    this.meta.updateTag({ name: 'description', content: 'Join TrichyFix as a verified service provider to connect with customers needing electricians, plumbers, and more in Trichy.' });
  }

  ngOnDestroy() {
    this.clearTimer();
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

  togglePassword() { this.showPassword = !this.showPassword; this.cdr.detectChanges(); }

  toggleCategory(cat: string) {
    const idx = this.selectedCategories.indexOf(cat);
    if (idx === -1) this.selectedCategories.push(cat);
    else this.selectedCategories.splice(idx, 1);
    this.cdr.detectChanges();
  }

  toggleArea(area: string) {
    const idx = this.selectedAreas.indexOf(area);
    if (idx === -1) this.selectedAreas.push(area);
    else this.selectedAreas.splice(idx, 1);
    this.cdr.detectChanges();
  }

  onIdProofChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 3 * 1024 * 1024) {
        this.showSnackbar('ID Proof size must be less than 3MB', 'error');
        input.value = '';
        return;
      }
      this.idProof = file;
    }
    this.cdr.detectChanges();
  }

  onProfilePhotoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 3 * 1024 * 1024) {
        this.showSnackbar('Profile Photo size must be less than 3MB', 'error');
        input.value = '';
        return;
      }
      this.profilePhoto = file;
    }
    this.cdr.detectChanges();
  }

  async sendOTP() {
    if (!this.phone || this.phone.length < 10) {
      this.otpError = 'Enter a valid phone number';
      return;
    }
    this.otpLoading = true;
    this.otpError = '';
    this.cdr.detectChanges();

    const result = await this.auth.sendOTP(this.phone, 'register');
    this.otpLoading = false;

    if (result.success) {
      this.otpSent = true;
      this.startTimer();
      if (result.devOTP) this.otpCode = result.devOTP;
    } else {
      this.otpError = result.message;
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
    if (this.otpInterval) { clearInterval(this.otpInterval); this.otpInterval = null; }
    this.cdr.detectChanges();
  }

  resendOTP() {
    this.otpCode = '';
    this.sendOTP();
  }

  nextStep() {
    this.errorMsg = '';
    if (this.currentStep === 1) {
      if (!this.fullName || !this.phone || !this.password) {
        this.showSnackbar('Please fill in all required fields!', 'error');
        return;
      }
      if (!this.otpVerified) {
        this.showSnackbar('You must verify your phone number with OTP first!', 'error');
        return;
      }
    }
    if (this.currentStep === 2) {
      if (this.selectedCategories.length === 0) {
        this.showSnackbar('Please select at least one distinct service category!', 'warning');
        return;
      }
    }
    if (this.currentStep < this.totalSteps) this.currentStep++;
    this.cdr.detectChanges();
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
    this.cdr.detectChanges();
  }

  async onSubmit() {
    this.errorMsg = '';

    if (!this.agreeTerms) {
      this.showSnackbar('You must implicitly agree to the Terms of Service to proceed.', 'error');
      return;
    }

    if (!this.idProofType) {
      this.showSnackbar('Please select an ID Proof Type!', 'error');
      return;
    }

    if (!this.idProof || !this.profilePhoto) {
      this.showSnackbar('CRITICAL: ID Proof Image & Profile Photo are both fully mandatory!', 'error');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('fullName', this.fullName);
    formData.append('phone', this.phone);
    formData.append('password', this.password);
    formData.append('experience', this.experience);
    formData.append('categories', JSON.stringify(this.selectedCategories));
    formData.append('areasServed', JSON.stringify(this.selectedAreas));
    formData.append('priceMin', this.priceMin);
    formData.append('priceMax', this.priceMax);
    formData.append('emergencyAvailable', String(this.emergencyAvailable));
    formData.append('idProofType', this.idProofType);
    formData.append('aboutBio', this.aboutBio);

    if (this.idProof) {
      formData.append('idProof', this.idProof, this.idProof.name);
    }

    if (this.profilePhoto) {
      formData.append('profilePhoto', this.profilePhoto, this.profilePhoto.name);
    }

    try {
      const res = await fetch(`${this.apiUrl}/auth/register/provider`, {
        method: 'POST',
        body: formData // Note: Browser automatically sets multipart/form-data boundary boundaries
      });
      const data = await res.json();
      this.loading = false;

      if (data.success) {
        if (data.token && data.user) {
          this.auth.setSession(data.token, data.refreshToken, data.user);
        }
        this.router.navigate(['/registration-success'], { queryParams: { type: 'provider' } });
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
