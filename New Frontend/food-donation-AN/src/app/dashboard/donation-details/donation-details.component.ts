import {
  Component,
  DestroyRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  signal,
  SimpleChanges,
} from '@angular/core';
import {
  DashboardService,
  ImageLoadState,
} from '../../services/dashboard.service';
import { donation } from '../donation.model';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterLink,
  RouterStateSnapshot,
} from '@angular/router';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { HasRoleDirective } from '../../directives/has-role.directive';
import { TokenService } from '../../services/token.service';
import { catchError, of, retry, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-details',
  imports: [DatePipe, HasRoleDirective, RouterLink, CommonModule],
  templateUrl: './donation-details.component.html',
  styleUrl: './donation-details.component.css',
})
export class DonationDetailComponent implements OnInit, OnChanges, OnDestroy {
  donation = signal<donation | undefined>(undefined);
  isFetching = signal(false);
  error = signal('');
  donationId!: string;

  isSubmittingDelete = false;
  isSubmittingClaim = false;
  isSubmittingComplete = false;

  private destroyRef = inject(DestroyRef);
  private dashboardService = inject(DashboardService);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private dialog: MatDialog
  ) {}

  imageState: 'loading' | 'loaded' | 'error' = 'loading';
  imageUrl: string | null = null;
  selectedImageUrl: string | null = null;

  private imageSubscription?: Subscription;
  private donationImageService = inject(DashboardService);

  role = this.tokenService.getUserRole();
  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.donationId = params.get('donationId') || '';

      this.isFetching.set(true);
      const subscription = this.dashboardService
        .loadDonation(this.donationId)
        .subscribe({
          next: (donation) => {
            this.donation.set(donation);
            this.loadDonationImage(); // ✅ Load image after donation is set
          },
          error: (error: Error) => this.error.set(error.message),
          complete: () => this.isFetching.set(false),
        });

      this.destroyRef.onDestroy(() => subscription.unsubscribe());
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['donation'] && this.donation()?.photoUrl) {
      this.loadDonationImage();
    }
  }

  ngOnDestroy() {
    if (this.imageSubscription) {
      this.imageSubscription.unsubscribe();
    }
  }

  deleteDonation(id: string): void {
    if (this.isSubmittingDelete) return;
    this.isSubmittingDelete = true;

    this.dashboardService.deleteDonationWithFeedback(
      id,
      this.dialog,
      this.router
    );
  }

  private loadDonationImage() {
    if (!this.donation()?.photoUrl || this.imageState === 'loaded') {
      console.log('Image already loaded or no photo URL available.');
    }

    this.imageSubscription = this.donationImageService
      .loadImage(this.donation()!.photoUrl)
      .pipe(
        retry(1), // retry once
        catchError((err) =>
          of({ state: 'error' as const, error: 'Image load failed' })
        )
      )
      .subscribe((imageState: ImageLoadState) => {
        this.imageState = imageState.state;
        this.imageUrl =
          imageState.url && !imageState.url.includes('/null')
            ? imageState.url
            : null;
      });
  }

  retryLoadImage() {
    if (this.donation()?.photoUrl) {
      this.donationImageService.clearImageFromCache(this.donation()!.photoUrl);
      this.loadDonationImage();
    }
  }

  claimDonation(): void {
    if (this.isSubmittingClaim) return;
    this.isSubmittingClaim = true;

    this.dashboardService.claimDonation(this.donationId).subscribe({
      next: () => window.location.reload(),
      error: (err) => {
        console.error('Error claiming donation:', err);
        this.isSubmittingClaim = false;
      },
    });
  }

  completeDonation(): void {
    if (this.isSubmittingComplete) return;
    this.isSubmittingComplete = true;

    this.dashboardService.completeDonation(this.donationId).subscribe({
      next: () => window.location.reload(),
      error: (err) => {
        console.error('Error completing donation:', err);
        this.isSubmittingComplete = false;
      },
    });
  }
}
