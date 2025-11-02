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
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import { catchError, of, retry, Subscription } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { UNITS } from '../units.constant';

import { donation } from '../donation.model';
import {
  DashboardService,
} from '../../services/dashboard.service';
import { MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { Dialog } from 'primeng/dialog';
import { MapComponent } from '../../map/map.component';
import { TokenService } from '../../services/token.service';

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
    AutoCompleteModule,
    FormsModule,
    MapComponent,
  ],
  templateUrl: './donation-form.component.html',
  styleUrls: ['./donation-form.component.css'],
  encapsulation: ViewEncapsulation.None, // ✅ Important
})
export class DonationFormComponent implements  OnDestroy {
  @Input() donationForm!: FormGroup;
  @Input() mode: 'create' | 'update' = 'create';
  @Input() donation: donation | null = null;
  @Input() isSubmitting = false;
  @Input() showSuccessDialog: boolean = false;
  @Input() maxAvailabilityDate: string | null = null;
  @Output() submitForm = new EventEmitter<void>();
  @Output() unitSelected = new EventEmitter<string>();
  // ✅ FIX: Output for map coordinate changes
  @Output() coordsChange = new EventEmitter<{ lat: number; lng: number }>();

  private defaultLat!: number | null;
  private defaultLng!: number | null;

  constructor(
    private location: Location,
    private messageService: MessageService,
    private router: Router,
    private tokenService: TokenService
  ) {}

  goBack(): void {
    this.location.back();
  }

  // imageState: 'loading' | 'loaded' | 'error' = 'loading';
  imageUrl: string | null = null;
  selectedImageUrl: string | null = null;

  private imageSubscription?: Subscription;
  // private donationImageService = inject(DashboardService);

  units = UNITS; // full list
  filteredUnits: { label: string; value: string; fullName?: string }[] = [];

  filterUnits(event: any) {
    const q = (event.query || '').toLowerCase();
    if (!q) {
      this.filteredUnits = [...this.units];
      return;
    }
    this.filteredUnits = this.units.filter(
      (u) =>
        u.label.toLowerCase().includes(q) ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        u.value.toLowerCase().includes(q)
    );
  }

  onUnitSelect(unitObj: any) {
    // unitObj is the selected object from suggestions
    this.unitSelected.emit(unitObj);
    console.log(unitObj.value.value);
  }

  // ngOnChanges(changes: SimpleChanges) {
  //   if (changes['donation'] && this.donation?.photoUrl) {
  //     this.loadDonationImage();
  //   }
  // }

  ngOnDestroy() {
    if (this.imageSubscription) {
      this.imageSubscription.unsubscribe();
    }
  }

  // private loadDonationImage() {
  //   const photoUrl = this.donation?.photoUrl;

  //   if (!photoUrl || photoUrl.includes('/null')) {
  //     this.imageState = 'error';
  //     this.imageUrl = null;
  //     this.messageService.add({
  //       severity: 'warn',
  //       summary: 'No Image',
  //       detail: 'No image available for this donation.',
  //     });
  //     return;
  //   }

  //   if (this.imageState === 'loaded') return;

  //   this.imageSubscription = this.donationImageService
  //     .loadImage(photoUrl)
  //     .pipe(
  //       retry(1),
  //       catchError((err) =>
  //         of({ state: 'error' as const, error: 'Image load failed' })
  //       )
  //     )
  //     .subscribe((imageState: ImageLoadState) => {
  //       this.imageState = imageState.state;
  //       this.imageUrl = imageState.url || null;

  //       if (imageState.state === 'error') {
  //         this.messageService.add({
  //           severity: 'error',
  //           summary: 'Image Load Failed',
  //           detail: imageState.error || 'Could not load donation image.',
  //         });
  //       }
  //     });
  // }

  onSubmit() {
    this.submitForm.emit();
  }

  onImageSelected(event: any): void {
    const file: File = event.files?.[0];
    console.log('Selected file:', file);

    if (file) {
      this.donationForm.get('image')?.setValue(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImageUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedImageUrl = null;
    }
  }

  // retryLoadImage() {
  //   const photoUrl = this.donation?.photoUrl;

  //   if (photoUrl) {
  //     this.messageService.add({
  //       severity: 'info',
  //       summary: 'Retrying',
  //       detail: 'Trying to reload image...',
  //     });
  //     this.loadDonationImage();
  //   }
  // }
  
  navigateToDashboard() {
    this.showSuccessDialog = false;
    this.router.navigate(['/dashboard']);
  }
}
