import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TokenService } from '../../services/token.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './oauth2-complete-profile.component.html',
})
export class Oauth2CompleteProfileComponent {
  profileForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private tokenService: TokenService
  ) {
    this.profileForm = this.fb.group({
      phone: ['', Validators.required],
      address: ['', Validators.required],
      role: [null, Validators.required],
    });
  }

  onSubmit() {
    if (this.profileForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    const token = this.tokenService.getToken();

    this.http
      .put<{ token: string; role: string; userId: number }>(
        'http://localhost:8080/users/update-oauth2-user',
        this.profileForm.value,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .subscribe({
        next: (response) => {
          this.tokenService.setToken(response.token);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.error('Update failed', err);
          this.isSubmitting = false; // allow retry
        },
      });
  }
}
