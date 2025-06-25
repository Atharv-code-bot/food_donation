import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DonationFormComponent } from '../donation-form/donation-form.component';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { SuccessDialogComponent } from '../../shared/success-dialog/success-dialog.component';

@Component({
  selector: 'app-create-donation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DonationFormComponent],
  template: `<app-donation-form
    [form]="form"
    mode="create"
    (submitForm)="handleSubmit()"
    [isSubmitting]="isSubmitting"
  />`,
})
export class CreateDonationComponent {
  isSubmitting = false;
  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private dialog: MatDialog
  ) {}
  fb = inject(FormBuilder);
  form = this.fb.group({
    itemName: ['', Validators.required],
    quantity: [1, Validators.required],
    bestBeforeDate: [''],
    pickupLocation: [''],
    availabilityStart: [''],
    availabilityEnd: [''],
    image: [null],
  });

  handleSubmit() {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true; // ✅ Block multiple submissions

    const normalize = (val: string | null | undefined): string | null =>
      val ?? null;

    const formatDateOnly = (
      value: string | null | undefined
    ): string | null => {
      if (!value) return null;
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
    };

    const formatDateTime = (
      value: string | null | undefined
    ): string | null => {
      if (!value) return null;
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().slice(0, 19); // "YYYY-MM-DDTHH:mm:ss"
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

    this.dashboardService.createDonation(formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        const dialogRef = this.dialog.open(SuccessDialogComponent, {
          data: { message: 'Donation created successfully!' },
        });

        dialogRef.afterClosed().subscribe(() => {
          this.router.navigate(['/dashboard']); // or any other route
        });
      },
      error: (err) => {
        console.error('Error creating donation:', err);
        this.isSubmitting = false;
      },
    });
  }
}
