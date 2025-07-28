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
import { ToastModule } from 'primeng/toast';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';

import { donation } from '../donation.model';
import {
  DashboardService,
  ImageLoadState,
} from '../../services/dashboard.service';
import { MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { Dialog } from 'primeng/dialog';

@Component({
  selector: 'app-donation-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ToastModule,
    FileUploadModule,
    ButtonModule,
    ConfirmDialog,
    LucideAngularModule,
    Dialog,
  ],
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
  @Input() showSuccessDialog: boolean = false;

  constructor(
    private location: Location,
    private messageService: MessageService,
    private router: Router,
  ) {}

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
    const photoUrl = this.donation?.photoUrl;

    if (!photoUrl || photoUrl.includes('/null')) {
      this.imageState = 'error';
      this.imageUrl = null;
      this.messageService.add({
        severity: 'warn',
        summary: 'No Image',
        detail: 'No image available for this donation.',
      });
      return;
    }

    if (this.imageState === 'loaded') return;

    this.imageSubscription = this.donationImageService
      .loadImage(photoUrl)
      .pipe(
        retry(1),
        catchError((err) =>
          of({ state: 'error' as const, error: 'Image load failed' })
        )
      )
      .subscribe((imageState: ImageLoadState) => {
        this.imageState = imageState.state;
        this.imageUrl = imageState.url || null;

        if (imageState.state === 'error') {
          this.messageService.add({
            severity: 'error',
            summary: 'Image Load Failed',
            detail: imageState.error || 'Could not load donation image.',
          });
        }
      });
  }

  onSubmit() {
    this.submitForm.emit();
  }

  onImageSelected(event: any): void {
    const file: File = event.files?.[0];
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
    const photoUrl = this.donation?.photoUrl;

    if (photoUrl) {
      this.messageService.add({
        severity: 'info',
        summary: 'Retrying',
        detail: 'Trying to reload image...',
      });

      this.donationImageService.clearImageFromCache(photoUrl);
      this.loadDonationImage();
    }
  }
  navigateToDashboard() {
    this.showSuccessDialog = false;
    this.router.navigate(['/dashboard']);
  }
}
