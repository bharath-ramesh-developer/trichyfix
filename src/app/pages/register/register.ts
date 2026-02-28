import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit {
  constructor(private title: Title, private meta: Meta) { }

  ngOnInit() {
    this.title.setTitle('Create Account - TrichyFix');
    this.meta.updateTag({ name: 'description', content: 'Join TrichyFix as a customer to book verified home services or register as a service provider.' });
  }
}
