import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './services.html',
  styleUrl: './services.css'
})
export class Services implements OnInit {
  searchQuery = '';
  selectedArea = 'All Areas';
  emergencyOnly = false;
  activeCategory = 'All Services';
  sortBy = 'rating';
  loading = true;

  categories: any[] = [];
  areas: string[] = [];
  providers: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private title: Title,
    private meta: Meta,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.title.setTitle('Find Home Services in Trichy - TrichyFix');
    this.meta.updateTag({ name: 'description', content: 'Search and book verified electricians, plumbers, and AC repair services across KK Nagar, Srirangam, and Thillai Nagar in Trichy.' });

    this.route.queryParams.subscribe(params => {
      if (params['search']) this.searchQuery = params['search'];
      if (params['area'] && params['area'] !== 'All Areas') this.selectedArea = params['area'];
      if (params['category']) this.activeCategory = params['category'];

      this.fetchProviders();
    });

    this.fetchInitialData();
  }

  async fetchInitialData() {
    try {
      const catRes = await fetch('https://trichyfix-backend-1-0.onrender.com/api/providers/categories');
      const catData = await catRes.json();
      if (catData.success) {
        this.categories = catData.categories;
        this.cdr.detectChanges();
      }

      const areaRes = await fetch('https://trichyfix-backend-1-0.onrender.com/api/providers/areas');
      const areaData = await areaRes.json();
      if (areaData.success) {
        this.areas = areaData.areas;
        this.cdr.detectChanges();
      }
    } catch (err) {
      console.error('Failed to load initial metadata');
    }
  }

  async fetchProviders() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const params = new URLSearchParams({
        category: this.activeCategory,
        area: this.selectedArea,
        emergency: this.emergencyOnly.toString(),
        search: this.searchQuery,
        sort: this.sortBy
      });

      const res = await fetch(`https://trichyfix-backend-1-0.onrender.com/api/providers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        this.providers = data.providers;
      }
    } catch (err) {
      console.error('Failed to load providers');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
    this.fetchProviders();
  }

  onFilterChange() {
    this.fetchProviders();
  }
}
