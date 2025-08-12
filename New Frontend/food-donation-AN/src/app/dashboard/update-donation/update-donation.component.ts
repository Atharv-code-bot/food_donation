import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
  AfterViewInit,
  DestroyRef,
} from '@angular/core';
import {
  ReactiveFormsModule,
  Validators,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { DonationFormComponent } from '../donation-form/donation-form.component';
import { donation } from '../donation.model'; // Correct path and interface name
import { ConfirmationService, MessageService } from 'primeng/api';
import { catchError, of, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UNITS } from '../units.constant';
import { DonationRequestPayload } from '../donationRequest.model';

@Component({
  selector: 'app-update-donation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DonationFormComponent,
    // Add PrimeNG modules here if map is rendered directly in this component's template
    // e.g., InputTextModule, InputNumberModule, DropdownModule etc.
  ],
  template: `
    <div>
      <app-donation-form
        [donationForm]="form"
        (unitSelected)="onUnitSelected($event)"
        mode="update"
        [donation]="currentDonation"
        (submitForm)="confirmUpdate()"
        [showSuccessDialog]="showSuccessDialog()"
      >
      </app-donation-form>
    </div>
  `,
  providers: [ConfirmationService, MessageService],
})
export class UpdateDonationComponent implements OnInit, AfterViewInit {
  fb = inject(FormBuilder);
  showSuccessDialog = signal(false);
  isBrowser: boolean;
  mapError = signal<string | null>(null);
  isMapLoading = signal(false);

  private readonly defaultMapLat = 18.5204;
  private readonly defaultMapLng = 73.875794;

  form!: FormGroup;
  donationId!: string;
  imageUrl: string | null = null;
  currentDonation: donation | null = null;
  private destroyRef = inject(DestroyRef);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private route: ActivatedRoute,
    private dashboardService: DashboardService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.initForm();
  }

  // Helper functions - ensuring they return 'string' or 'string | null' as needed
  // normalize: returns string | null, which means we must check for null when assigning to strict 'string' type
  normalize = (val: string | null | undefined): string | null => val ?? null;

  // formatDateOnly: returns string | null, needs to be handled
  formatDateOnly = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  };

  // formatDateTime: returns string | null, needs to be handled
  formatDateTime = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 19);
  };

  // toInputDate: returns string | null, ensure usage handles this
  toInputDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }

  // toInputDateTime (re-added as class method for consistency if used in template)
  toInputDateTimeForTemplate(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
      return new Date(value).toISOString().slice(0, 16); // "yyyy-MM-ddTHH:mm"
    } catch {
      return null;
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      itemName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      bestBeforeDate: [''],
      pickupLocation: [''],
      availabilityStart: [''],
      availabilityEnd: [''],
      latitude: ['', Validators.required],
      longitude: ['', Validators.required],
      image: [null as File | null],
      quantityUnit: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.donationId = this.route.snapshot.paramMap.get('donationId')!;

    if (this.isBrowser) {
      this.dashboardService
        .loadDonation(this.donationId)
        .pipe(
          take(1),
          takeUntilDestroyed(this.destroyRef),
          catchError((err) => {
            console.error('Error loading donation (client-side):', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Loading Failed',
              detail: 'Failed to load donation details. Please try again.',
            });
            if (err.status === 401) {
              this.router.navigate(['/auth/signin']);
            }
            return of(null);
          })
        )
        .subscribe(async (donationData: donation | null) => {
          if (donationData) {
            this.currentDonation = donationData;
            const matchedUnit =
              UNITS.find(
                (u) =>
                  u.value === donationData.quantityUnit ||
                  u.label === donationData.quantityUnitLabel ||
                  u.fullName === donationData.quantityUnitLabel
              ) ?? null;

            this.form.patchValue({
              itemName: donationData.itemName,
              quantity: donationData.quantity,
              // Use null-coalescing to ensure string | null becomes string | ''
              bestBeforeDate:
                this.toInputDate(donationData.bestBeforeDate) ?? '', // Use helper
              pickupLocation: donationData.pickupLocation,
              availabilityStart:
                this.toInputDateTimeForTemplate(
                  donationData.availabilityStart
                ) ?? '', // Use helper
              availabilityEnd:
                this.toInputDateTimeForTemplate(donationData.availabilityEnd) ??
                '', // Use helper
              latitude: donationData.latitude,
              longitude: donationData.longitude,
              quantityUnit: donationData.quantityUnitLabel,
            });

            console.log('quantityUnit control value:', this.form.get('quantityUnit')?.value);


            if (donationData.photoUrl) {
              this.imageUrl = 'http://localhost:8080' + donationData.photoUrl;
            }

            await this.initializeMapForUpdate();
          } else {
            console.warn(
              'Donation data was not loaded or an error occurred. Cannot initialize form/map.'
            );
          }
        });

      this.dashboardService.selectedCoordinates$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((coords) => {
          this.form.patchValue({
            latitude: coords.lat.toFixed(6),
            longitude: coords.lng.toFixed(6),
          });
        });
    } else {
      console.log(
        'UpdateDonationComponent: Running on server. Deferring data load and map setup to client.'
      );
      this.currentDonation = null;
    }
  }

  ngAfterViewInit(): void {}

  private async initializeMapForUpdate(): Promise<void> {
    if (!this.isBrowser) {
      this.mapError.set('Map can only be loaded in a browser environment.');
      return;
    }

    let initialLat: number | null = null;
    let initialLng: number | null = null;
    if (
      this.currentDonation &&
      this.currentDonation.latitude !== null &&
      this.currentDonation.longitude !== null
    ) {
      const parsedLat = parseFloat(this.currentDonation.latitude);
      const parsedLng = parseFloat(this.currentDonation.longitude);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        initialLat = parsedLat;
        initialLng = parsedLng;
      }
    }

    this.isMapLoading.set(true);
    const error = await this.dashboardService.initializeLocationSelectionMap(
      'map', // Ensure this ID matches the map container in your HTML template
      initialLat,
      initialLng,
      this.defaultMapLat,
      this.defaultMapLng
    );

    if (error) {
      this.mapError.set(error);
    }
    this.isMapLoading.set(false);
  }

  confirmUpdate() {
    if (!this.isBrowser) return;
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill all required fields.',
      });
      this.form.markAllAsTouched();
      return;
    }

    this.confirmationService.confirm({
      key: 'global',
      message: `Are you sure you want to update this donation?`,
      header: 'Confirm Update',
      icon: 'pi pi-refresh',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Update',
        severity: 'primary',
      },
      accept: () => {
        this.handleSubmit();
      },
      reject: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Update Cancelled',
          detail: 'No changes were made.',
        });
      },
    });
  }

  onUnitSelected(unitValue: any) {
    this.form.patchValue({ quantityUnit: unitValue.label });
  }

  handleSubmit() {
    if (!this.isBrowser) return;
    const donationData: DonationRequestPayload = {
      itemName: this.normalize(this.form.value.itemName) ?? '',
      quantity: this.form.value.quantity ?? 1,
      quantityUnit: this.form.value.quantityUnit?.value ?? null, // ✅ Send full form (e.g., "KILOGRAMS")
      bestBeforeDate: this.formatDateOnly(this.form.value.bestBeforeDate) ?? '',
      pickupLocation: this.normalize(this.form.value.pickupLocation) ?? '',
      availabilityStart:
        this.formatDateTime(this.form.value.availabilityStart) ?? '',
      availabilityEnd:
        this.formatDateTime(this.form.value.availabilityEnd) ?? '',
      latitude: this.normalize(this.form.value.latitude) ?? '',
      longitude: this.normalize(this.form.value.longitude) ?? '',
    };

    const formData = new FormData();
    console.log(this.form.value.longitude, this.form.value.latitude);
    console.log(donationData.longitude, donationData.latitude);
    formData.append('donationRequest', JSON.stringify(donationData));
    if (this.form.value.image) {
      formData.append('image', this.form.value.image);
    }

    this.dashboardService
      .updateDonation(this.donationId, formData)
      .pipe(
        catchError((err) => {
          console.error('Error updating donation:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Update Failed',
            detail: 'Failed to update donation. Please try again.',
          });
          if (err.status === 401) {
            this.router.navigate(['/auth/signin']);
          }
          return of(null);
        })
      )
      .subscribe((result) => {
        if (result) {
          this.showSuccessDialog.set(true);
          this.messageService.add({
            severity: 'success',
            summary: 'Donation Updated',
            detail: 'Your donation has been updated successfully.',
          });
        }
      });
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      this.dashboardService.destroyMap();
    }
  }
}
