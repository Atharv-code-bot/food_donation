import {
  Component,
  inject,
  PLATFORM_ID,
  signal,
  DestroyRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormGroup, // <-- Import FormGroup
} from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../../services/dashboard.service';
import { DonationFormComponent } from '../donation-form/donation-form.component';
import { MessageService } from 'primeng/api';
import { TokenService } from '../../services/token.service';
import { bestBeforeDateValidator } from '../../validators/date.validators';
// import * as L from 'leaflet';

@Component({
  selector: 'app-create-donation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DonationFormComponent],
  template: `<app-donation-form
    [donationForm]="form"
    (unitSelected)="onUnitSelected($event)"
    mode="create"
    [showSuccessDialog]="showSuccessDialog()"
    (submitForm)="handleSubmit()"
    [isSubmitting]="isSubmitting"
    (coordsChange)="onCoordsChange($event)"
    [maxAvailabilityDate]="maxAvailabilityDate" 
  />`, // <-- Pass the maxAvailabilityDate to the child
})
export class CreateDonationComponent implements OnInit, OnDestroy {
  form!: FormGroup; // <-- 1. Declare form as a class property
  isSubmitting = false;
  showSuccessDialog = signal(false);
  mapError = signal<string | null>(null);
  mapLoading = signal(false);
  selectedUnitValue!: string;
  private defaultLat!: number | null;
  private defaultLng!: number | null;
  private readonly defaultMapLat = 18.5204;
  private readonly defaultMapLng = 73.8567;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  maxAvailabilityDate: string | null = null;
  private dateSub?: Subscription;

  // @ViewChild('map', { static: false }) mapElementRef!: ElementRef; // This was commented out in the original, but you may need it.

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private dialog: MatDialog,
    private messageService: MessageService,
    private destroyRef: DestroyRef,
    private tokenService: TokenService
  ) {}
  fb = inject(FormBuilder);

  ngOnInit() {
    // 2. Assign this.form *before* you subscribe to it
    this.form = this.fb.group(
      {
        itemName: ['', Validators.required],
        quantity: [1, Validators.required],
        bestBeforeDate: ['', Validators.required],
        pickupLocation: ['', Validators.required],
        availabilityStart: ['', Validators.required],
        availabilityEnd: ['', Validators.required],
        image: [null],
        latitude: ['', Validators.required],
        longitude: ['', Validators.required],
        quantityUnit: [null, Validators.required],
      },
      {
        validators: [bestBeforeDateValidator()],
      }
    );

    // 3. Now it's safe to subscribe to this.form
    this.dateSub = this.form
      .get('bestBeforeDate')
      ?.valueChanges.subscribe((value) => {
        if (value) {
          this.maxAvailabilityDate = `${value}T23:59`;
        } else {
          this.maxAvailabilityDate = null;
        }
      });
  }

  ngOnDestroy() {
    if (this.dateSub) {
      this.dateSub.unsubscribe();
    }
  }

  onUnitSelected(unit: any) {
    this.form.patchValue({ quantityUnit: unit.value.label });
    this.selectedUnitValue = unit.value.value;
  }

  onCoordsChange(coords: { lat: number; lng: number }): void {
    if (!this.form || coords.lat === null || coords.lng === null) {
    console.warn('onCoordsChange called before form was ready or with invalid coords.');
    return; // Do nothing
  }
    this.form.patchValue({
      latitude: coords.lat.toFixed(6),
      longitude: coords.lng.toFixed(6),
    });
  }

  handleSubmit(): void {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    // ... (rest of your handleSubmit method is fine) ...
    const normalize = (val: string | null | undefined): string | null =>
      val ?? null;

    const formatDateOnly = (
      value: string | null | undefined
    ): string | null => {
      if (!value) return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    };

    const formatDateTime = (
      value: string | null | undefined
    ): string | null => {
      if (!value) return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19);
    };

    const donationData = {
      itemName: normalize(this.form.value.itemName),
      quantity: this.form.value.quantity ?? 1,
      quantityUnit: this.selectedUnitValue,
      bestBeforeDate: formatDateOnly(this.form.value.bestBeforeDate),
      pickupLocation: normalize(this.form.value.pickupLocation),
      availabilityStart: formatDateTime(this.form.value.availabilityStart),
      availabilityEnd: formatDateTime(this.form.value.availabilityEnd),
      latitude: normalize(this.form.value.latitude),
      longitude: normalize(this.form.value.longitude),
    };

    const formData = new FormData();
    formData.append('donationRequest', JSON.stringify(donationData));

    if (this.form.value.image) {
      formData.append('image', this.form.value.image);
    }
    console.log('Submitting donation data:', donationData);
    this.dashboardService.createDonation(formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thank You!',
          detail: 'Thank you for your donation!',
        });
        this.showSuccessDialog.set(true);
      },
      error: (err) => {
        console.error('Error creating donation:', err);
        this.messageService.add({
          severity: 'warn',
          summary: 'Cancelled',
          detail: 'Creation Failed',
        });
        this.isSubmitting = false;
      },
    });
  }
}