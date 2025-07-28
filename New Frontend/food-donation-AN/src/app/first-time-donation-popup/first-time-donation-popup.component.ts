import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Dialog } from 'primeng/dialog';

@Component({
  selector: 'app-first-time-donation-popup',
  imports: [Dialog, LucideAngularModule,CommonModule],
  templateUrl: './first-time-donation-popup.component.html',
  styleUrls: ['./first-time-donation-popup.component.css'],
})
export class FirstTimeDonationPopupComponent implements OnInit {
  @Input({required: true}) role: string = '';
  constructor(private router: Router) {}

  visible = false;

  ngOnInit(): void {
    const hasSeenPopup = localStorage.getItem('donorFirstTimePopupShown');
    if (!hasSeenPopup) {
      this.visible = true;
      localStorage.setItem('donorFirstTimePopupShown', 'true');
    }
  }

  closeDialog() {
    this.visible = false;
  }

  navigateToCreateDonation() {
    this.visible = false;
    this.router.navigate(['/dashboard/create']);
  }
}
