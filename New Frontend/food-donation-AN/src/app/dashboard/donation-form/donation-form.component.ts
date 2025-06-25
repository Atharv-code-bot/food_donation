import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnDestroy,
  inject,
  SimpleChanges,
  OnChanges,
  ViewEncapsulation,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import { catchError, of, retry, Subscription } from 'rxjs';


import { donation } from '../donation.model';
import {
  DashboardService,
  ImageLoadState,
} from '../../services/dashboard.service';

@Component({
  selector: 'app-donation-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './donation-form.component.html',
  styleUrls: ['./donation-form.component.css'],
  encapsulation: ViewEncapsulation.None, // ✅ Important
})
export class DonationFormComponent implements OnChanges, OnDestroy {
  @Input() form!: FormGroup;
  @Input() mode: 'create' | 'update' = 'create';
  @Input() donation: donation | null = null;
  @Output() submitForm = new EventEmitter<void>();
  @Input() isSubmitting = false;

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }

  imageState: 'loading' | 'loaded' | 'error' = 'loading';
  imageUrl: string | null = null;
  selectedImageUrl: string | null = null;

  private imageSubscription?: Subscription;
  private donationImageService = inject(DashboardService);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['donation'] && this.donation?.photoUrl) {
      this.loadDonationImage();
    }
  }

  ngOnDestroy() {
    if (this.imageSubscription) {
      this.imageSubscription.unsubscribe();
    }
    
  }

  private loadDonationImage() {
    if (!this.donation?.photoUrl || this.imageState === 'loaded') return;

    console.log(this.donation.photoUrl);
    this.imageSubscription = this.donationImageService
      .loadImage(this.donation.photoUrl)
      .pipe(
        retry(1), // retry once
        catchError((err) =>
          of({ state: 'error' as const, error: 'Image load failed' })
        )
      )
      .subscribe((imageState: ImageLoadState) => {
        this.imageState = imageState.state;
        this.imageUrl = imageState.url || null;
      });
  }

  onSubmit() {
    this.submitForm.emit();
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    console.log('Selected file:', file);
    if (file) {
      this.form.get('image')?.setValue(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImageUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedImageUrl = null;
    }
  }

  retryLoadImage() {
    if (this.donation?.photoUrl) {
      this.donationImageService.clearImageFromCache(this.donation.photoUrl);
      this.loadDonationImage();
    }
  }
}
