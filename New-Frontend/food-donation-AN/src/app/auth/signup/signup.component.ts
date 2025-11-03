// src/app/auth/signup/signup.component.ts
import {
  Component,
  inject,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common'; // Import PLATFORM_ID, Inject
import { LucideAngularModule } from 'lucide-angular';
import { AuthResponseData } from '../auth.model'; // Import AuthResponseData
import { take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink, CommonModule, LucideAngularModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  formSubmitted = false;
  isSigningUp = false;
  isSigningUpWithGoogle = false;

  enteredUsername = '';
  enteredEmail = '';
  enteredFullname = '';
  enteredPassword = '';
  enteredRole = '';
  enteredPhone = '';
  enteredAddress = '';
  errorMessage = signal<string | null>(null);

  isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  isFormValid = computed(
    () =>
      this.enteredUsername.trim() &&
      this.enteredEmail.trim() &&
      this.enteredFullname.trim() &&
      this.enteredPassword.trim() &&
      this.enteredRole.trim() &&
      this.enteredPhone.trim().match(/^\d{10}$/) &&
      this.enteredAddress.trim()
  );

  onSubmit() {
    this.isSigningUp = true;
    if (
      !this.isFormValid() // Use computed signal for validity check
    ) {
      this.errorMessage.set(
        'Please fill out all fields correctly before submitting.'
      );
      this.isSigningUp = false;
      return;
    }

    this.authService
      .register({
        username: this.enteredUsername,
        email: this.enteredEmail,
        password: this.enteredPassword,
        role: this.enteredRole,
        fullname: this.enteredFullname,
        phone: this.enteredPhone,
        address: this.enteredAddress,
      })
      .pipe(take(1))
      .subscribe({
        next: (res: AuthResponseData) => {
          this.authService.onLoginSuccess(res); // ✅ FIX: Call public onLoginSuccess
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message ||
              'Registration failed. Please try again later.'
          );
          this.isSigningUp = false;
        },
        complete: () => {
          this.isSigningUp = false;
        },
      });
  }

  loginWithGoogle() {
    this.isSigningUpWithGoogle = true;
    if (isPlatformBrowser(this.platformId)) {
      // Use the NEW absoluteApiUrl variable
      window.location.href = `${environment.absoluteApiUrl}/oauth2/authorization/google`;
    }
  }
}
