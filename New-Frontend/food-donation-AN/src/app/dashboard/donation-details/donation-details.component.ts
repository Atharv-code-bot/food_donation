import {
  Component,
  DestroyRef,
  Inject,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  SimpleChanges,
} from '@angular/core';
import {
  DashboardService,
} from '../../services/dashboard.service';
import { donation } from '../donation.model';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CommonModule,
  DatePipe,
  isPlatformBrowser,
  Location,
} from '@angular/common';
import { HasRoleDirective } from '../../directives/has-role.directive';
import { TokenService } from '../../services/token.service';
import { catchError, of, retry, Subscription, take, throwError } from 'rxjs';
import { InputOtpModule } from 'primeng/inputotp';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LucideAngularModule } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MapComponent } from '../../map/map.component';

@Component({
  selector: 'app-details',
  imports: [
    DatePipe,
    HasRoleDirective,
    RouterLink,
    CommonModule,
    InputOtpModule,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    LucideAngularModule,
    MapComponent,
  ],
  templateUrl: './donation-details.component.html',
  styleUrl: './donation-details.component.css',
  providers: [ConfirmationService, MessageService],
})
export class DonationDetailComponent implements OnInit, OnDestroy {
  value: any;
  donation = signal<donation | undefined>(undefined);
  isFetching = signal(false);
  error = signal('');
  donationId!: string;

  isSubmittingDelete = false;
  isSubmittingClaim = false;
  isSubmittingComplete = false;
  isOtpSent = false;
  otpValue = '';
  isSubmittingOtp = false;
  canResend = true;
  resendCountdown = 0;
  resendInterval: any;
  showImageModal = false;

  // ✅ New signal to track successful completion for UI control
  donationSuccessfullyCompleted = signal(false);

  isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private route: ActivatedRoute,
    private location: Location,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private destroyRef = inject(DestroyRef);
  private dashboardService = inject(DashboardService);
  private tokenService = inject(TokenService);
  private router = inject(Router);

  imageState: 'loading' | 'loaded' | 'error' = 'loading';
  imageUrl: string | null = null;
  selectedImageUrl: string | null = null;
  latitude: string | null = null;
  longitude: string | null = null;

  private imageSubscription?: Subscription;

  role = this.tokenService.getUserRole();
  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.donationId = params.get('donationId') || '';
        this.isFetching.set(true);

        if (this.isBrowser) {
          this.dashboardService
            .loadDonation(this.donationId)
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              catchError((err) => {
                console.error(
                  'Error loading donation details (client-side):',
                  err
                );
                this.error.set(
                  err.message || 'Failed to load donation details.'
                );
                this.messageService.add({
                  severity: 'error',
                  summary: 'Loading Failed',
                  detail: 'Failed to load donation details. Please try again.',
                });
                if (err.status === 401) {
                  this.router.navigate(['/auth/signin']);
                }
                return of(undefined);
              })
            )
            .subscribe(async (donationData: donation | undefined) => {
              if (donationData) {
                this.donation.set(donationData);
                // this.loadDonationImage();
                // Map initialization is now handled by the MapComponent's OnChanges hook
              } else {
                console.warn(
                  'Donation data was not loaded or an error occurred. Cannot display details.'
                );
                this.error.set('Donation details could not be loaded.');
              }
              this.isFetching.set(false);
            });
        } else {
          console.log(
            'DonationDetailComponent: Running on server. Deferring data load and map setup to client.'
          );
          this.isFetching.set(false);
        }
      });
  }

  // ngOnChanges(changes: SimpleChanges) {
  //   if (changes['donation'] && this.donation()?.photoUrl) {
  //     this.loadDonationImage();
  //   }
  // }

  ngOnDestroy() {
    if (this.imageSubscription) {
      this.imageSubscription.unsubscribe();
    }
    // Clear resend interval if it's active
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
  }

  openImageModal() {
    this.showImageModal = true;
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden';
    }
    console.log('Image modal clicked');
  }

  closeImageModal() {
    this.showImageModal = false;
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }

  deleteDonation(id: string): void {
    if (this.isSubmittingDelete) return;
    this.isSubmittingDelete = true;

    this.dashboardService.deleteDonation(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Donation successfully deleted!',
        });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Error deleting donation:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: 'Failed to delete donation. Please try again.',
        });
        if (err.status === 401) {
          this.router.navigate(['/auth/signin']);
        }
      },
      complete: () => {
        this.isSubmittingDelete = false;
      },
    });
  }

  // private loadDonationImage() {
  //   if (
  //     !this.isBrowser ||
  //     !this.donation()?.photoUrl ||
  //     this.donation()?.photoUrl.includes('/null')
  //   ) {
  //     this.imageState = 'error';
  //     this.imageUrl = null;
  //     if (this.isBrowser) {
  //       this.messageService.add({
  //         severity: 'warn',
  //         summary: 'No Image',
  //         detail: 'No image available for this donation.',
  //       });
  //     }
  //     return;
  //   }

  //   if (this.imageState === 'loaded') {
  //     console.log('Image already loaded.');
  //     return;
  //   }

  //   this.imageSubscription = this.dashboardService
  //     .loadImage(this.donation()!.photoUrl)
  //     .pipe(
  //       retry(1),
  //       takeUntilDestroyed(this.destroyRef),
  //       catchError((err) => {
  //         console.error('Image load failed:', err);
  //         return of({ state: 'error' as const, error: 'Image load failed' });
  //       })
  //     )
  //     .subscribe((imageState: ImageLoadState) => {
  //       this.imageState = imageState.state;
  //       this.imageUrl =
  //         imageState.url && !imageState.url.includes('/null')
  //           ? imageState.url
  //           : null;
  //       if (this.imageState === 'error' && this.isBrowser) {
  //         this.messageService.add({
  //           severity: 'error',
  //           summary: 'Image Error',
  //           detail: 'Failed to load donation image.',
  //         });
  //       }
  //     });
  // }

  // retryLoadImage() {
  //   if (this.isBrowser && this.donation()?.photoUrl) {
  //     this.loadDonationImage();
  //   } else if (this.isBrowser) {
  //     this.messageService.add({
  //       severity: 'warn',
  //       summary: 'No Image',
  //       detail: 'No image URL to retry loading.',
  //     });
  //   }
  // }

  confirmClaimDonation(event: Event): void {
    this.confirmationService.confirm({
      key: 'global',
      target: event.target as EventTarget,
      message: 'Are you sure you want to claim this donation?',
      header: 'Confirm Claim',
      icon: 'pi pi-question-circle',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        this.claimDonation();
      },
      reject: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Cancelled',
          detail: 'Donation claim cancelled.',
        });
      },
    });
  }

  claimDonation(): void {
    if (!this.isBrowser || this.isSubmittingClaim) return;
    this.isSubmittingClaim = true;

    this.dashboardService
      .claimDonation(this.donationId)
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        catchError((err: HttpErrorResponse) => {
          console.error('Error claiming donation:', err);
          this.isSubmittingClaim = false;
          let errorMessage = 'Failed to claim donation. Please try again.';
          if (err.error && err.error.message) {
            errorMessage = err.error.message;
          } else if (err.status === 409) {
            errorMessage =
              'This donation has already been claimed by another NGO.';
          } else if (err.status === 400) {
            errorMessage = 'Invalid request to claim donation.';
          }
          this.messageService.add({
            severity: 'error',
            summary: 'Claim Failed',
            detail: errorMessage,
          });
          if (err.status === 401) {
            this.router.navigate(['/auth/signin']);
          }
          return of(null);
        })
      )
      .subscribe((result) => {
        if (result) {
          this.messageService.add({
            severity: 'success',
            summary: 'Claimed!',
            detail:
              'Donation successfully claimed! You can now send OTP for pickup.',
          });
          this.reloadDonationData();
        }
        this.isSubmittingClaim = false;
      });
  }

  sendOtp(): void {
    if (!this.isBrowser || !this.canResend || this.isSubmittingOtp) return;
    this.isSubmittingOtp = true;

    this.dashboardService
      .sendOtp(this.donationId)
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        catchError((err: HttpErrorResponse) => {
          console.error('Failed to send OTP:', err);
          this.isSubmittingOtp = false;
          let errorMessage = 'Failed to send OTP. Please try again.';
          if (err.error && err.error.message) {
            errorMessage = err.error.message;
          } else if (err.status === 400) {
            errorMessage =
              'OTP already sent recently. Please wait or check status.';
          }
          this.messageService.add({
            severity: 'error',
            summary: 'OTP Failed',
            detail: errorMessage,
          });
          if (err.status === 401) {
            this.router.navigate(['/auth/signin']);
          }
          return of(null);
        })
      )
      .subscribe((result) => {
        if (result) {
          this.isOtpSent = true;
          this.messageService.add({
            severity: 'success',
            summary: 'OTP Sent!',
            detail:
              'OTP sent to donor phone number. Enter it below to complete.',
          });
          this.startResendCooldown();
        }
        this.isSubmittingOtp = false;
      });
  }

  startResendCooldown(): void {
    this.canResend = false;
    this.resendCountdown = 60;

    this.resendInterval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.canResend = true;
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }

  confirmCompleteDonation(event: Event): void {
    if (!this.isBrowser) return;
    if (!this.otpValue) {
      this.messageService.add({
        severity: 'warn',
        summary: 'OTP Required',
        detail: 'Please enter the OTP to complete the donation.',
      });
      return;
    }
    this.confirmationService.confirm({
      key: 'global',
      target: event.target as EventTarget,
      message: 'Are you sure you want to mark this donation as complete?',
      header: 'Confirm Completion',
      icon: 'pi pi-check-circle',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => {
        this.verifyOtp();
      },
      reject: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Cancelled',
          detail: 'Donation completion cancelled.',
        });
      },
    });
  }

  // ✅ Verify OTP (Complete Donation) Logic with specific error handling for wrong OTP
  verifyOtp(): void {
    if (!this.isBrowser || !this.otpValue || this.isSubmittingComplete) return;
    this.isSubmittingComplete = true;

    this.dashboardService
      .completeDonation(this.donationId, this.otpValue)
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        catchError((err: HttpErrorResponse) => {
          console.error('Error completing donation:', err);
          this.isSubmittingComplete = false;
          let errorMessage =
            'Failed to complete donation. Please check OTP and try again.';
          let summary = 'Completion Failed';
          let severity = 'error';

          if (
            err.status === 400 &&
            err.error &&
            (err.error.message.includes('Invalid OTP') ||
              err.error.error.includes('Invalid OTP'))
          ) {
            errorMessage =
              'The OTP you entered is incorrect. Please try again.';
            summary = 'Incorrect OTP';
            severity = 'warn';
            this.otpValue = ''; // Clear OTP value on incorrect entry for security/UX
          } else if (
            err.status === 400 &&
            err.error &&
            (err.error.message === 'OTP expired' ||
              err.error.error === 'OTP expired')
          ) {
            errorMessage = 'The OTP has expired. Please request a new one.';
            summary = 'OTP Expired';
            severity = 'warn';
            this.otpValue = ''; // Clear OTP value
            this.isOtpSent = false; // Reset OTP state to allow re-sending
            clearInterval(this.resendInterval); // Stop countdown
            this.canResend = true; // Allow resend immediately
          } else if (err.status === 401) {
            // Unauthorized
            errorMessage = 'You are not authorized. Please log in again.';
            summary = 'Unauthorized';
            this.messageService.add({
              severity: severity,
              summary: summary,
              detail: errorMessage,
            });
            this.router.navigate(['/auth/signin']);
            return of(null);
          } else if (err.error && err.error.message) {
            errorMessage = err.error.message;
          }

          this.messageService.add({
            severity: severity,
            summary: summary,
            detail: errorMessage,
          });
          return of(null);
        })
      )
      .subscribe((result) => {
        if (result) {
          this.messageService.add({
            severity: 'success',
            summary: 'Completed!',
            detail: 'Donation successfully marked as complete!',
          });

          // ✅ UI State Reset after SUCCESS
          this.otpValue = ''; // Clear OTP input
          this.isOtpSent = false; // Hide OTP section (will show Request OTP button)
          clearInterval(this.resendInterval); // Stop any ongoing cooldown
          this.canResend = true; // Allow resend if needed in future (though status changes)
          this.donationSuccessfullyCompleted.set(true); // ✅ Mark donation as completed in UI state

          // After marking donation as complete and updating local state,
          // it's good practice to reflect the status change if the user stays on the page.
          // You could reload specific data or simply update the signal directly.
          // For simplicity and immediate feedback, we'll navigate after a delay.
          setTimeout(() => {
            this.router.navigate(['/dashboard']); // Redirect to dashboard or relevant list
          }, 2000); // 2-second delay to view the toast
        }
        this.isSubmittingComplete = false;
      });
  }

  confirmDelete(event: Event, id: string) {
    if (!this.isBrowser) return;
    this.confirmationService.confirm({
      key: 'global',
      target: event.target as EventTarget,
      message: `Do you want to delete this record?`,
      header: 'Danger',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Delete',
        severity: 'danger',
      },
      accept: () => {
        this.deleteDonation(id);
      },
      reject: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Cancelled',
          detail: 'Deletion aborted',
        });
      },
    });
  }

  private reloadDonationData(): void {
    if (!this.isBrowser) return;
    this.isFetching.set(true);
    this.dashboardService
      .loadDonation(this.donationId)
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.error('Error reloading donation data:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Reload Failed',
            detail: 'Could not refresh donation status.',
          });
          return of(undefined);
        })
      )
      .subscribe((updatedDonation) => {
        if (updatedDonation) {
          this.donation.set(updatedDonation); // Update the donation signal
        }
        this.isFetching.set(false);
      });
  }
}
