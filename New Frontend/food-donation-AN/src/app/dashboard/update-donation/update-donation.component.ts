import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { DonationFormComponent } from '../donation-form/donation-form.component';
import { donation } from '../donation.model';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-update-donation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DonationFormComponent],
  template: `<app-donation-form
    [form]="form"
    mode="update"
    [donation]="currentDonation"
    (submitForm)="handleSubmit()"
  />`,
})
export class UpdateDonationComponent implements OnInit {
  fb = inject(FormBuilder);

  constructor(
    private route: ActivatedRoute,
    private dashboardService: DashboardService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  form = this.fb.group({
    itemName: ['', Validators.required],
    quantity: [1, Validators.required],
    bestBeforeDate: [''],
    pickupLocation: [''],
    availabilityStart: [''],
    availabilityEnd: [''],
    image: [null as File | null],
  });

  donationId!: string;
  // In your parent component (e.g., UpdateDonationComponent)
  imageUrl: string | null = null;
  currentDonation: donation | null = null;

  ngOnInit(): void {
    this.donationId = this.route.snapshot.paramMap.get('donationId')!;
    this.dashboardService.loadDonation(this.donationId).subscribe({
      next: (donation: donation) => {
        this.imageUrl = null;
        this.currentDonation = donation; // Store the donation object

        const toInputDateTime = (
          value: string | null | undefined
        ): string | null => {
          if (!value) return null;
          try {
            return new Date(value).toISOString().slice(0, 16); // "yyyy-MM-ddTHH:mm"
          } catch {
            return null;
          }
        };
        function toInputDate(dateStr: string): string {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0]; // returns 'YYYY-MM-DD'
        }

        this.form.patchValue({
          itemName: donation.itemName,
          quantity: donation.quantity,
          bestBeforeDate: toInputDate(donation.bestBeforeDate),
          pickupLocation: donation.pickupLocation,
          availabilityStart: toInputDateTime(donation.availabilityStart),
          availabilityEnd: toInputDateTime(donation.availabilityEnd),
        });

        // Keep the old imageUrl for fallback if needed
        if (donation.photoUrl) {
          this.imageUrl = 'http://localhost:8080' + donation.photoUrl;
        }
      },
      error: (err) => {
        console.error('Error loading donation:', err);
      },
    });
  }

  handleSubmit() {
    const normalize = (val: string | null | undefined): string | null =>
      val ?? null;

    const formatDateOnly = (
      value: string | null | undefined
    ): string | null => {
      if (!value) return null;
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };

    const formatDateTime = (
      value: string | null | undefined
    ): string | null => {
      if (!value) return null;
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().slice(0, 19);
    };

    const donationData = {
      itemName: normalize(this.form.value.itemName),
      quantity: this.form.value.quantity ?? 1,
      bestBeforeDate: formatDateOnly(this.form.value.bestBeforeDate),
      pickupLocation: normalize(this.form.value.pickupLocation),
      availabilityStart: formatDateTime(this.form.value.availabilityStart),
      availabilityEnd: formatDateTime(this.form.value.availabilityEnd),
    };

    const formData = new FormData();
    formData.append('donationRequest', JSON.stringify(donationData));
    if (this.form.value.image) {
      formData.append('image', this.form.value.image);
    }

    // ✅ Use wrapper with dialog
    this.dashboardService.updateDonationWithFeedback(
      this.donationId,
      formData,
      this.dialog,
      this.router
    );
  }
}
