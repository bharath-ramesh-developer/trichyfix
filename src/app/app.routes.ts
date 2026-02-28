import { Routes } from '@angular/router';
import { authGuard, roleGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
    // ── Public routes ─────────────────────────────────────────
    {
        path: '',
        loadComponent: () => import('./pages/landing/landing').then(m => m.Landing)
    },
    {
        path: 'services',
        loadComponent: () => import('./pages/services/services').then(m => m.Services)
    },
    {
        path: 'book/:id',
        loadComponent: () => import('./pages/book-service/book-service').then(m => m.BookService),
        canActivate: [authGuard]
    },
    {
        path: 'booking-confirmed',
        loadComponent: () => import('./pages/booking-confirmed/booking-confirmed').then(m => m.BookingConfirmed),
        canActivate: [authGuard]
    },

    // ── Auth routes (guest-only) ──────────────────────────────
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login').then(m => m.Login),
        canActivate: [guestGuard]
    },
    {
        path: 'register',
        loadComponent: () => import('./pages/register/register').then(m => m.Register),
        canActivate: [guestGuard]
    },
    {
        path: 'register/customer',
        loadComponent: () => import('./pages/register-customer/register-customer').then(m => m.RegisterCustomer),
        canActivate: [guestGuard]
    },
    {
        path: 'register/provider',
        loadComponent: () => import('./pages/register-provider/register-provider').then(m => m.RegisterProvider),
        canActivate: [guestGuard]
    },
    {
        path: 'registration-success',
        loadComponent: () => import('./pages/registration-success/registration-success').then(m => m.RegistrationSuccess)
    },

    // ── Provider routes (provider role only) ──────────────────
    {
        path: 'provider/dashboard',
        loadComponent: () => import('./pages/provider-dashboard/provider-dashboard').then(m => m.ProviderDashboard),
        canActivate: [roleGuard('provider')]
    },
    {
        path: 'provider/notifications',
        loadComponent: () => import('./pages/provider-notifications/provider-notifications').then(m => m.ProviderNotifications),
        canActivate: [roleGuard('provider')]
    },

    {
        path: 'my-bookings',
        loadComponent: () => import('./pages/customer-bookings/customer-bookings').then(m => m.CustomerBookings),
        canActivate: [roleGuard('customer')]
    },
    // ── Admin routes (admin role only) ────────────────────────
    {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin').then(m => m.Admin),
        canActivate: [roleGuard('admin')]
    },
    {
        path: 'admin/verification',
        loadComponent: () => import('./pages/admin/admin').then(m => m.Admin),
        canActivate: [roleGuard('admin')]
    },

    // ── Catch-all ─────────────────────────────────────────────
    {
        path: '**',
        redirectTo: ''
    }
];
