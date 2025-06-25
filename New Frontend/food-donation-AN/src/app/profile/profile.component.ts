import { Component, OnInit } from '@angular/core';
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
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../header/header.component";
// import '../../styles/theme.scss';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  imports: [SidebarComponent, ReactiveFormsModule, FormsModule, CommonModule, HeaderComponent],
})
export class ProfileComponent implements OnInit {
  user: any;
  profileImageUrl: any;
  isEditing = false;
  passwordMismatch = false;
  isUpdatingPassword = false;

  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.userService.getCurrentUser().subscribe((data) => {
      this.user = data;
      this.initForms();
      this.loadImage(data.photoUrl);
    });
  }

  private initForms() {
    this.profileForm = this.fb.group({
      fullname: [
        { value: this.user.fullname, disabled: true },
        Validators.required,
      ],
      phone: [{ value: this.user.phone, disabled: true }, Validators.required],
      address: [
        { value: this.user.address, disabled: true },
        Validators.required,
      ],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required],
    });
  }

  enableEditing() {
    this.isEditing = true;
    this.profileForm.enable();
  }

  cancelEdit() {
    this.profileForm.patchValue({
      fullname: this.user.fullname,
      phone: this.user.phone,
      address: this.user.address,
    });
    this.profileForm.disable();
    this.isEditing = false;
  }

  saveChanges() {
    const updatedData = {
      username: this.user.username || 'dummyUsername',
      email: this.user.email || 'dummy@example.com',
      password: 'dummyPassword123',
      role: this.user.role || 'ROLE_DONOR',
      fullname: this.profileForm.get('fullname')?.value,
      phone: this.profileForm.get('phone')?.value,
      address: this.profileForm.get('address')?.value,
    };

    this.userService.updateUserProfile(updatedData).subscribe({
      next: () => {
        this.isEditing = false;
        this.profileForm.disable();
      },
      error: (err) => {
        console.error('❌ Update failed:', err);
      },
    });
  }

  onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.userService.updateUserAvatar(file).subscribe({
      next: () => {
        this.userService.getCurrentUser().subscribe((updatedUser) => {
          this.user = updatedUser;
          localStorage.setItem('photoUrl', JSON.stringify(this.user.photoUrl));
          this.loadImage(this.user.photoUrl);
        });
      },
      error: (err) => {
        console.error('❌ Error uploading avatar:', err);
      },
    });
  }

  loadImage(photoUrl: string) {
    if (!photoUrl) return;

    this.userService.getUserImage(photoUrl).subscribe({
      next: (blob) => {
        const objectURL = URL.createObjectURL(blob);
        this.profileImageUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
      },
      error: (err) => {
        console.error('❌ Error loading profile image:', err);
      },
    });
  }

  checkPasswordMatch() {
    const { newPassword, confirmPassword } = this.passwordForm.value;
    this.passwordMismatch =
      newPassword && confirmPassword && newPassword !== confirmPassword;
  }

  updatePassword() {
    if (
      this.passwordMismatch ||
      this.passwordForm.invalid ||
      this.isUpdatingPassword
    )
      return;

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.isUpdatingPassword = true;

    this.userService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.passwordMismatch = false;
        this.isUpdatingPassword = false;
      },
      error: (err) => {
        console.error('❌ Failed to change password:', err);
        this.isUpdatingPassword = false;
      },
    });
  }
}
