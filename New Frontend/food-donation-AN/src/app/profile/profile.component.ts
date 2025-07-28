import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
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
    DialogModule, // Correct module for p-dialog
    ButtonModule, // For p-button
    InputTextModule, // For pInputText
    TextareaModule, // For pInputTextarea
    ConfirmDialogModule, // For p-confirmDialog
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
  private platformId = inject(PLATFORM_ID); // ✅ Inject PLATFORM_ID
  private isBrowser: boolean; // Store the flag

  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private messageService: MessageService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
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
      });
    } else {
      // Fallback for if user is not loaded yet (though ngOnInit should handle this)
      this.profileForm = this.fb.group({
        fullname: [{ value: '', disabled: true }, Validators.required],
        phone: [{ value: '', disabled: true }, Validators.required],
        address: [{ value: '', disabled: true }, Validators.required],
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
  }

  saveChanges() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched(); // Mark all fields to show validation errors
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill all required fields correctly.',
      });
      return;
    }

    const updatedData = {
      username: this.user?.username, // Keep existing values
      email: this.user?.email, // Keep existing values
      password: 'dummyPassword123', // ✅ IMPORTANT: Handle this securely in real app
      role: this.user?.role, // Keep existing values
      fullname: this.profileForm.get('fullname')?.value,
      phone: this.profileForm.get('phone')?.value,
      address: this.profileForm.get('address')?.value,
    };

    this.userService.updateUserProfile(updatedData).subscribe({
      next: () => {
        this.showEditModal = false;
        // Re-fetch user to get the absolute latest data and update UI
        this.userService.getCurrentUser().subscribe((updatedUser) => {
          this.user = updatedUser;
          this.profileForm.disable(); // Disable form after successful update
        });
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Profile updated successfully!',
        });
      },
      error: (err) => {
        console.error('Update failed:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update profile. Please try again.',
        });
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
          localStorage.setItem('photoUrl', JSON.stringify(this.user.photoUrl));
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
    this.userService.getUserImage(photoUrl).subscribe({
      next: (blob) => {
        const objectURL = URL.createObjectURL(blob);
        this.profileImageUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
      },
      error: (err) => {
        console.error('Error loading profile image:', err);
        this.profileImageUrl =
          'https://primefaces.org/cdn/primeng/images/avatar/amyelsner.png';
      },
    });
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
