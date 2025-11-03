import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { UserService } from '../services/user.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { LucideAngularModule } from 'lucide-angular';
import { DialogModule } from 'primeng/dialog'; // ✅ Use DialogModule
import { ButtonModule } from 'primeng/button'; // ✅ New: For PrimeNG buttons
import { InputTextModule } from 'primeng/inputtext'; // ✅ New: For PrimeNG inputs
import { TextareaModule } from 'primeng/textarea'; // ✅ New: For PrimeNG textarea
import { ConfirmDialogModule } from 'primeng/confirmdialog'; // If you're using confirm dialog later
import { User } from '../services/user.model';
import { MapComponent } from '../map/map.component';
import { DashboardService } from '../services/dashboard.service';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TokenService } from '../services/token.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  imports: [
    SidebarComponent,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    HeaderComponent,
    ToastModule,
    LucideAngularModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ConfirmDialogModule,
    MapComponent,
  ],
  providers: [MessageService], // MessageService is usually provided at component level or root
})
export class ProfileComponent implements OnInit {
  user: User | null = null; // ✅ Use User interface for type safety
  profileImageUrl: any;
  // isEditing is no longer strictly needed as showEditModal drives the state
  passwordMismatch = false;
  isUpdatingPassword = false;
  showEditModal = false;
  showMapModal = false; // ✅ New signal for the map dialog
  selectedAddress = signal<string | null>(null); // ✅ New signal to display the selected address
  isSubmittingChanges = false;
  isSettingDefaultLocation = false;
  private isLocationSelected = signal(false);
  private platformId = inject(PLATFORM_ID); // ✅ Inject PLATFORM_ID
  private isBrowser: boolean; // Store the flag
  private dashboardService = inject(DashboardService); // ✅ Inject DashboardService

  // ✅ FIX: Declare these as class properties
  private defaultLat!: number | null;
  private defaultLng!: number | null;

  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private messageService: MessageService,
    private destroyRef: DestroyRef,
    private tokenService: TokenService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    const { latitude, longitude } = this.tokenService.getCoordinates();
    this.defaultLat = latitude ? parseFloat(latitude) : null;
    this.defaultLng = longitude ? parseFloat(longitude) : null;
  }

  ngOnInit(): void {
    // ✅ FIX: Only fetch current user data if running in the browser
    if (this.isBrowser) {
      this.userService.getCurrentUser().subscribe({
        // Assuming getCurrentUser makes the HTTP call
        next: (data: User) => {
          this.user = data;
          this.initForms(); // Initialize forms AFTER user data is loaded
          this.loadImage(data.photoUrl!); // Load image after user data
          // ✅ FIX: Convert numbers to strings before setting in TokenService
          // this.updateSelectedAddress();
          if (data.latitude && data.longitude) {
            this.tokenService.setCoordinates(
              data.latitude.toString(),
              data.longitude.toString()
            );
          }
        },
        error: (err) => {
          console.error('Error loading current user data:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load profile data.',
          });
          // Initialize forms with empty data if user data fails to load
          this.user = null; // Ensure user is null
          this.initForms();
          this.loadImage(null); // Load default image
        },
      });
    } else {
      // Running on server, do not attempt HTTP requests
      console.log(
        'ProfileComponent: Running on server. Deferring profile data load to client.'
      );
      // Initialize forms with default/empty values for server-side rendering
      this.user = null; // Ensure user is null on server
      this.initForms();
      this.loadImage(null); // Load default image on server
    }
  }

  private initForms() {
    // Ensure this.user is available before accessing its properties
    if (this.user) {
      this.profileForm = this.fb.group({
        fullname: [
          { value: this.user.fullname ?? '', disabled: true },
          Validators.required,
        ],
        phone: [
          { value: this.user.phone ?? '', disabled: true },
          Validators.required,
        ],
        address: [
          { value: this.user.address ?? '', disabled: true },
          Validators.required,
        ],
        // ✅ FIX: Add latitude and longitude to the form group
        latitude: [
          { value: this.user.latitude ?? '', disabled: true },
          Validators.required,
        ],
        longitude: [
          { value: this.user.longitude ?? '', disabled: true },
          Validators.required,
        ],
      });
    } else {
      // Fallback for if user is not loaded yet (though ngOnInit should handle this)
      this.profileForm = this.fb.group({
        fullname: [{ value: '', disabled: true }, Validators.required],
        phone: [{ value: '', disabled: true }, Validators.required],
        address: [{ value: '', disabled: true }, Validators.required],
        // ✅ FIX: Add latitude and longitude to the fallback form group
        latitude: [{ value: '', disabled: true }, Validators.required],
        longitude: [{ value: '', disabled: true }, Validators.required],
      });
    }

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required],
    });
  }

  openEditModal() {
    // Patch values from the current user data to the form
    this.profileForm.patchValue({
      fullname: this.user?.fullname,
      phone: this.user?.phone,
      address: this.user?.address,
    });
    this.profileForm.enable(); // Enable form fields for editing
    this.showEditModal = true;
    this.selectedAddress.set(null);
  }

  // Changed from enableEditing, combined with openEditModal for simplicity
  // enableEditing() {
  //   this.isEditing = true;
  //   this.profileForm.enable();
  // }

  cancelEdit() {
    // Revert changes by patching original values back
    this.profileForm.patchValue({
      fullname: this.user?.fullname,
      phone: this.user?.phone,
      address: this.user?.address,
    });
    this.profileForm.disable(); // Disable fields after canceling
    this.showEditModal = false; // Close the modal
    this.messageService.add({
      severity: 'warn',
      summary: 'Cancelled',
      detail: 'Profile update aborted', // More specific detail
    });
    // this.isEditing = false; // No longer strictly needed if showEditModal drives state
    this.selectedAddress.set(null);
    this.resetMap();
    this.isLocationSelected.set(false);
  }

  // ✅ New helper method to get and display the address from coordinates
  // ✅ FIX: The updated method to correctly handle the Promise and types
  async updateSelectedAddress(): Promise<void> {
    if (!this.isBrowser || !this.user?.latitude || !this.user?.longitude) {
      this.selectedAddress.set(null);
      return;
    }
    try {
      const lat = this.user.latitude;
      const lng = this.user.longitude;

      // ✅ Use `await` directly on the Promise returned by `reverseGeocode()`
      const address = await this.dashboardService.reverseGeocode(lat, lng);
      this.selectedAddress.set(address);
    } catch (e) {
      console.error('Failed to get address for default location:', e);
      this.selectedAddress.set(null);
    }
  }

  // ✅ FIX: This is the method that will correctly initialize the map
  openMapDialogAndInit() {
    this.showMapModal = true;
    this.selectedAddress.set(null);

    // ✅ FIX: Use a small delay to ensure the p-dialog's content is rendered
    setTimeout(() => {
      // Now the DOM element with the ID 'profile-map-editor' is guaranteed to exist
      const mapId = 'profile-map-editor';
      const initialLat = this.profileForm.get('latitude')?.value
        ? parseFloat(this.profileForm.get('latitude')?.value)
        : null;
      const initialLng = this.profileForm.get('longitude')?.value
        ? parseFloat(this.profileForm.get('longitude')?.value)
        : null;
      const defaultMapLat = 18.5204;
      const defaultMapLng = 73.875794;

      this.dashboardService.initializeLocationSelectionMap(
        mapId,
        initialLat,
        initialLng,
        this.defaultLat!,
        this.defaultLng!
      );
      // Move the map from the hidden container to the dialog container
      const mapContainer = document.getElementById('profile-map-editor');
      const dialogContainer = document.getElementById(
        'profile-map-editor-dialog'
      );
      if (mapContainer && dialogContainer) {
        dialogContainer.appendChild(mapContainer);
      }
    }, 100); // 100ms is a safe delay for dialogs to render
  }

  // ✅ New method to handle coordinates from the map component
  onCoordsChange(coords: { lat: number; lng: number }) {
    if (!this.profileForm || coords.lat === null || coords.lng === null) {
      console.warn(
        'onCoordsChange called before form was ready or with invalid coords.'
      );
      return; // Do nothing
    }
    this.profileForm.patchValue({
      latitude: coords.lat.toFixed(6),
      longitude: coords.lng.toFixed(6),
    });
    console.log(coords.lat, coords.lng);
    // console.log("address", this.selectedAddress)
    if (this.isLocationSelected()) {
      this.updateSelectedAddress();
    }
  }

  // ✅ New method to close the map dialog and confirm selection
  closeMapDialogAndSave() {
    this.isLocationSelected.set(true);
    this.showMapModal = false;
    this.messageService.add({
      severity: 'success',
      summary: 'Location Saved',
      detail: 'Default location has been updated in the form.',
    });
  }

  // ✅ FIX: New method to reset the map state
  resetMap(): void {
    if (!this.isBrowser || !this.user?.latitude || !this.user?.longitude) {
      this.dashboardService.destroyMap();
      return;
    }
    const initialLat = this.user.latitude;
    const initialLng = this.user.longitude;
    const mapId = 'profile-map-editor';

    // const defaultLat = Number(localStorage.getItem('latitude'));
    // const defaultLng = Number(localStorage.getItem('longitude'));

    // The map is currently initialized on the 'profile-map-editor' div, so we just
    // re-initialize it with the original coordinates
    this.dashboardService.initializeLocationSelectionMap(
      mapId,
      initialLat,
      initialLng,
      this.defaultLat!,
      this.defaultLng!
    );
  }

  // ✅ FIX: The saveChanges method is updated to pass lat/lng and other data
  saveChanges() {
    if (this.profileForm.invalid || this.isSubmittingChanges) return;

    this.isSubmittingChanges = true;

    // Use a new temporary object to send to the backend
    const updatedData: {
      fullname: string | null;
      phone: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
    } = {
      fullname: this.profileForm.get('fullname')?.value,
      phone: this.profileForm.get('phone')?.value,
      address: this.profileForm.get('address')?.value,
      latitude: parseFloat(this.profileForm.get('latitude')?.value),
      longitude: parseFloat(this.profileForm.get('longitude')?.value),
    };
    console.log(updatedData);

    // ✅ FIX: Correctly save latitude and longitude as strings in localStorage
    const latitudeValue = this.profileForm.get('latitude')?.value;
    const longitudeValue = this.profileForm.get('longitude')?.value;

    this.tokenService.setCoordinates(latitudeValue, longitudeValue);

    this.userService
      .updateUserProfile(updatedData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showEditModal = false;
          this.userService.getCurrentUser().subscribe((updatedUser) => {
            this.user = updatedUser;
          });
          this.messageService.add({
            severity: 'success',
            summary: 'Updated',
            detail: 'Profile updated successfully',
          });
        },
        error: (err) => {
          console.error('Update failed:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update profile',
          });
        },
        complete: () => {
          this.isSubmittingChanges = false;
        },
      });
  }

  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!this.user) {
      console.error('User data not loaded yet, cannot update avatar.');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User data not ready for avatar update. Please try again.',
      });
      return;
    }

    // Pass the typed user object
    this.userService.updateUserAvatar(file, this.user).subscribe({
      next: () => {
        this.userService.getCurrentUser().subscribe((updatedUser: User) => {
          // ✅ Type updatedUser as User
          this.user = updatedUser;
          if (this.isBrowser) {
            localStorage.setItem(
              'photoUrl',
              JSON.stringify(this.user.photoUrl)
            );
          }
          this.loadImage(this.user?.photoUrl!);
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Avatar updated successfully!',
        });
      },
      error: (err) => {
        console.error('❌ Error uploading avatar:', err);
        const errorMessage =
          err.error?.message || 'Avatar update failed. Please try again.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
        });
      },
    });
  }

  // Ensure loadImage also handles SSR-safety if it makes HTTP requests
  loadImage(photoUrl: string | null): void {
    if (!this.isBrowser) {
      this.profileImageUrl =
        'https://primefaces.org/cdn/primeng/images/avatar/amyelsner.png'; // Default on server
      return;
    }
    if (!photoUrl) {
      this.profileImageUrl =
        'https://primefaces.org/cdn/primeng/images/avatar/amyelsner.png';
      return;
    }
    this.profileImageUrl = photoUrl;
  }

  checkPasswordMatch() {
    const newPasswordControl = this.passwordForm.get('newPassword');
    const confirmPasswordControl = this.passwordForm.get('confirmPassword');

    if (newPasswordControl && confirmPasswordControl) {
      this.passwordMismatch =
        newPasswordControl.value &&
        confirmPasswordControl.value &&
        newPasswordControl.value !== confirmPasswordControl.value;
    } else {
      this.passwordMismatch = false;
    }
  }

  updatePassword() {
    if (
      this.passwordForm.invalid ||
      this.passwordMismatch ||
      this.isUpdatingPassword
    ) {
      this.passwordForm.markAllAsTouched(); // Mark fields to show errors
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please ensure all password fields are valid and match.',
      });
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.isUpdatingPassword = true;

    this.userService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.passwordMismatch = false;
        this.isUpdatingPassword = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Password updated successfully!',
        });
      },
      error: (err) => {
        console.error('❌ Failed to change password:', err);
        this.isUpdatingPassword = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            'Failed to change password. Please ensure current password is correct.',
        });
      },
    });
  }
}
