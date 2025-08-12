import {
  Component,
  OnInit,
  AfterViewInit,
  inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  signal,
  DestroyRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../../services/dashboard.service';
import { DonationFormComponent } from '../donation-form/donation-form.component';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UNITS } from '../units.constant';
// import * as L from 'leaflet';

@Component({
  selector: 'app-create-donation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DonationFormComponent, Dialog],
  template: `<app-donation-form
    [donationForm]="form"
    (unitSelected)="onUnitSelected($event)"
    mode="create"
    [showSuccessDialog]="showSuccessDialog()"
    (submitForm)="handleSubmit()"
    [isSubmitting]="isSubmitting"
  />`,
})
export class CreateDonationComponent implements OnInit, AfterViewInit {
  isSubmitting = false;
  showSuccessDialog = signal(false);
  mapError = signal<string | null>(null);
  mapLoading = signal(false);
  // Default coordinates (Pune, India)
  private readonly defaultMapLat = 18.5204;
  private readonly defaultMapLng = 73.8567;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @ViewChild('map', { static: false }) mapElementRef!: ElementRef;

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private dialog: MatDialog,
    private messageService: MessageService,
    private destroyRef: DestroyRef
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
    latitude: ['', Validators.required], // Initialize with empty string
    longitude: ['', Validators.required], // Initialize with empty string
    quantityUnit: [null, Validators.required], // ✅ Added this
  });

  onUnitSelected(unit: any) {
    this.form.patchValue({ quantityUnit: unit.value.value });
  }

  ngOnInit(): void {
    // This part remains the same. It subscribes to coordinate changes
    // emitted by the service's map methods and patches the form.
    this.dashboardService.selectedCoordinates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((coords) => {
        this.form.patchValue({
          latitude: coords.lat.toFixed(6),
          longitude: coords.lng.toFixed(6),
        });
      });
  }

  // ✅ Call the map initialization here
  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) {
      this.mapError.set('Map can only be loaded in a browser environment.');
      return;
    }

    this.mapLoading.set(true);
    // Call the method designed for location selection/creation
    const error = await this.dashboardService.initializeLocationSelectionMap(
      'map', // Use the ID of your map container
      null, // No initial existing latitude for new creation
      null, // No initial existing longitude for new creation
      this.defaultMapLat, // Fallback default latitude
      this.defaultMapLng // Fallback default longitude
    );

    if (error) {
      this.mapError.set(error);
    }
    this.mapLoading.set(false);
  }

  ngOnDestroy(): void {
    // Clean up the map instance when the component is destroyed
    this.dashboardService.destroyMap();
  }

  handleSubmit(): void {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

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
      quantityUnit: this.form.value.quantityUnit, // ✅ Added this
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
