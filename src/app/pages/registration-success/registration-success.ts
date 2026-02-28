import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Title, Meta } from '@angular/platform-browser';

@Component({
    selector: 'app-registration-success',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './registration-success.html',
    styleUrl: './registration-success.css'
})
export class RegistrationSuccess implements OnInit {
    type: 'customer' | 'provider' = 'customer';
    showToast = false;

    constructor(private route: ActivatedRoute, private title: Title, private meta: Meta) { }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.type = params['type'] === 'provider' ? 'provider' : 'customer';
            if (this.type === 'provider') {
                this.title.setTitle('Provider Registration Successful - TrichyFix');
                this.meta.updateTag({ name: 'description', content: 'Your provider application has been submitted and is under review. Please wait for an admin to approve your request.' });
            } else {
                this.title.setTitle('Registration Successful - TrichyFix');
                this.meta.updateTag({ name: 'description', content: 'Your customer account has been successfully created. Welcome to TrichyFix.' });
            }
        });

        setTimeout(() => { this.showToast = true; }, 500);
        setTimeout(() => { this.showToast = false; }, 5000);
    }
}
