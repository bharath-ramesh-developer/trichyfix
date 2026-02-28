import { Component, OnInit, AfterViewInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class Landing implements OnInit, AfterViewInit {
  searchQuery = '';
  selectedArea = '';

  @ViewChildren('animSection') animSections!: QueryList<ElementRef>;

  constructor(
    public auth: AuthService,
    private router: Router,
    private title: Title,
    private meta: Meta
  ) { }

  ngOnInit() {
    this.title.setTitle('TrichyFix — Home Services at Your Doorstep in Trichy');
    this.meta.updateTag({ name: 'description', content: 'Book verified electricians, plumbers, and AC repair pros in Trichy. Quick response, transparent pricing, and 100% satisfaction guaranteed.' });
  }

  ngAfterViewInit() {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    this.animSections.forEach(section => {
      observer.observe(section.nativeElement);
    });
  }

  onSearch() {
    this.router.navigate(['/services'], {
      queryParams: {
        search: this.searchQuery,
        area: this.selectedArea
      }
    });
  }

  areas = ['KK Nagar', 'Srirangam', 'Thillai Nagar', 'Woraiyur', 'Cantonment', 'Puthur', 'Tennur', 'Crawford'];

  services = [
    { name: 'Electrician', tamil: 'மின்சாரம்', color: '#FF8A00', desc: 'Wiring, switches, MCB repair, fan installation', category: 'Electrician', jobs: '2.4K+ jobs done' },
    { name: 'Plumber', tamil: 'குழாய்', color: '#2196f3', desc: 'Pipe fitting, leak repair, bathroom fixtures', category: 'Plumber', jobs: '1.8K+ jobs done' },
    { name: 'AC Repair', tamil: 'ஏசி பழுது', color: '#00bfa5', desc: 'AC service, gas refill, installation', category: 'AC Repair', jobs: '3.1K+ jobs done' },
    { name: 'Appliance Repair', tamil: 'சாதனங்கள்', color: '#8B5CF6', desc: 'Washing machine, fridge, geyser repair', category: 'Appliance', jobs: '1.2K+ jobs done' },
    { name: 'Painting', tamil: 'பெயிண்டிங்', color: '#EC4899', desc: 'Interior, exterior, waterproofing', category: 'Painting', jobs: '800+ jobs done' },
    { name: 'Carpentry', tamil: 'மரவேலை', color: '#D97706', desc: 'Furniture repair, modular kitchen, doors', category: 'Carpentry', jobs: '650+ jobs done' }
  ];

  steps = [
    { num: 'STEP 01', title: 'Search Service', desc: 'Browse services by type and area in Trichy', icon: '🔍', color: '#F5A623' },
    { num: 'STEP 02', title: 'Book Appointment', desc: 'Pick a provider, choose date & time, describe your issue', icon: '📅', color: '#3B82F6' },
    { num: 'STEP 03', title: 'Get It Fixed', desc: 'Verified professional arrives on time and completes the job', icon: '✅', color: '#10B981' },
    { num: 'STEP 04', title: 'Rate & Review', desc: 'Share your experience and help the community', icon: '⭐', color: '#8B5CF6' }
  ];

  testimonials = [
    { text: '"Called at 11PM for an electrical emergency. The electrician arrived in 20 minutes. Amazing service!"', name: 'Priya Sundaram', area: 'KK Nagar', rating: 5 },
    { text: '"Best AC repair service in Trichy. Transparent pricing, no hidden charges. Highly recommend TrichyFix!"', name: 'Rajesh Kumar', area: 'Srirangam • AC Repair', rating: 5 },
    { text: '"Very professional plumber. Fixed our leaking pipe quickly. The booking process was so easy through the app."', name: 'Indira Devi', area: 'Thillai Nagar', rating: 5 }
  ];

  stats = [
    { value: '500+', label: 'Verified Pros' },
    { value: '10K+', label: 'Happy Customers' },
    { value: '15 min', label: 'Avg Response' }
  ];

  providerStats = [
    { value: '500+', label: 'Active Providers', sub: 'and growing' },
    { value: '₹35K', label: 'Avg Monthly Income', sub: 'per provider' },
    { value: '78%', label: 'Repeat Customers', sub: 'satisfaction rate' },
    { value: '25+', label: 'Areas Covered', sub: 'across Trichy' }
  ];
}
