import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';


interface VerificationRequest {
  id: number;
  name: string;
  category: string;
  area: string;
  phone: string;
  experience: number;
  submitted: string;
  initial: string;
  idType: string;
  idNumber: string;
  skills: string[];
  status: 'pending' | 'approved' | 'rejected';
}

@Component({
  selector: 'app-admin-verification',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-verification.html',
  styleUrl: './admin-verification.css'
})
export class AdminVerification {
  requests: VerificationRequest[] = [
    {
      id: 1, name: 'Ravi AC Services', category: 'AC Repair', area: 'Thillai Nagar',
      phone: '+91 96543 21098', experience: 4, submitted: '18 Feb 2026', initial: 'R',
      idType: 'Aadhaar Card', idNumber: 'XXXX-XXXX-7890',
      skills: ['AC Service', 'Gas Refill', 'Installation', 'Repair'], status: 'pending'
    },
    {
      id: 2, name: 'Ganesh Home Repairs', category: 'Carpentry', area: 'Woraiyur',
      phone: '+91 95432 10987', experience: 6, submitted: '19 Feb 2026', initial: 'G',
      idType: 'Driving License', idNumber: 'TN-31-XXXX-2024',
      skills: ['Furniture Repair', 'Modular Kitchen', 'Door Installation'], status: 'pending'
    },
    {
      id: 3, name: 'Selvan Electricals', category: 'Electrician', area: 'Tennur',
      phone: '+91 94321 09876', experience: 3, submitted: '20 Feb 2026', initial: 'S',
      idType: 'Aadhaar Card', idNumber: 'XXXX-XXXX-4567',
      skills: ['Wiring', 'MCB', 'Fan Installation'], status: 'pending'
    }
  ];

  get pendingRequests() {
    return this.requests.filter(r => r.status === 'pending');
  }

  approveRequest(id: number) {
    const r = this.requests.find(r => r.id === id);
    if (r) {
      r.status = 'approved';
      alert(`${r.name} has been approved and verified!`);
    }
  }

  rejectRequest(id: number) {
    const r = this.requests.find(r => r.id === id);
    if (r) {
      r.status = 'rejected';
      alert(`${r.name} has been rejected.`);
    }
  }
}
