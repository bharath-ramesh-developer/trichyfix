import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';

import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer],
  template: `
    @if (showNavbar) {
      <app-navbar></app-navbar>
    }
    <main>
      <router-outlet></router-outlet>
    </main>
    @if (showFooter) {
      <app-footer></app-footer>
    }
    `,
  styles: [`
    main {
      min-height: 100vh;
    }
  `]
})
export class App {
  showNavbar = true;
  showFooter = true;

  private hideNavRoutes = ['/login', '/register', '/register/customer', '/register/provider', '/registration-success'];
  private hideFooterRoutes = ['/login', '/register', '/register/customer', '/register/provider', '/registration-success', '/provider/dashboard', '/provider/notifications', '/admin', '/admin/verification'];

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      this.showNavbar = !this.hideNavRoutes.some(r => url.startsWith(r));
      this.showFooter = !this.hideFooterRoutes.some(r => url.startsWith(r));
    });
  }
}
