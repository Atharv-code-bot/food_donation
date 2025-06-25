import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  formSubmitted = false;


  enteredUsername = '';
  enteredEmail = '';
  enteredFullname = '';
  enteredPassword = '';
  enteredRole = '';
  enteredPhone = '';
  enteredAddress = '';
  errorMessage = signal<string | null>(null);

  // Computed validation check
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
  if (
    !this.enteredUsername.trim() ||
    !this.enteredEmail.trim() ||
    !this.enteredFullname.trim() ||
    !this.enteredPassword.trim() ||
    !this.enteredRole.trim() ||
    !this.enteredPhone.trim().match(/^\d{10}$/) ||
    !this.enteredAddress.trim()
  ) {
    this.errorMessage.set('Please fill out all fields correctly before submitting.');
    return;
  }

  this.authService.register({
    username: this.enteredUsername,
    email: this.enteredEmail,
    password: this.enteredPassword,
    role: this.enteredRole,
    fullname: this.enteredFullname,
    phone: this.enteredPhone,
    address: this.enteredAddress,
  }).subscribe({
    next: (res) => {
      this.authService.saveSession(res);
      this.router.navigate(['/dashboard']);
    },
    error: (err) => {
      this.errorMessage.set(
        err?.error || 'Registration failed. Please try again later.'
      );
    },
  });
}


  loginWithGoogle() {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  }
}
