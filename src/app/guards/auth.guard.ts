import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * AuthGuard — Blocks unauthenticated users.
 * Redirects to /login if no valid session found.
 */
export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isLoggedIn()) {
        return true;
    }

    router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    return false;
};

/**
 * RoleGuard factory — Blocks users who don't have one of the specified roles.
 * Usage in routes: canActivate: [roleGuard('admin')]
 *                  canActivate: [roleGuard('admin', 'provider')]
 */
export function roleGuard(...allowedRoles: string[]): CanActivateFn {
    return () => {
        const auth = inject(AuthService);
        const router = inject(Router);

        if (!auth.isLoggedIn()) {
            router.navigate(['/login']);
            return false;
        }

        const role = auth.userRole();
        if (role && allowedRoles.includes(role)) {
            return true;
        }

        // Redirect based on user role
        if (auth.isAdmin()) {
            router.navigate(['/admin']);
        } else if (auth.isProvider()) {
            router.navigate(['/provider/dashboard']);
        } else {
            router.navigate(['/']);
        }
        return false;
    };
}

/**
 * GuestGuard — Blocks logged-in users from accessing auth pages.
 * Redirects to role-appropriate dashboard.
 */
export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
        return true;
    }

    // Already logged in — redirect to appropriate page
    const role = auth.userRole();
    if (role === 'admin') {
        router.navigate(['/admin']);
    } else if (role === 'provider') {
        router.navigate(['/provider/dashboard']);
    } else {
        router.navigate(['/']);
    }
    return false;
};
