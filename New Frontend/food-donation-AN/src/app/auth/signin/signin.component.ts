// src/app/auth/signin/signin.component.ts
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { LucideAngularModule } from 'lucide-angular';
import { FirebaseMessagingService } from '../../services/firebase-messaging.service';
import { take } from 'rxjs/operators';
import { AuthResponseData } from '../../auth/auth.model'; // Import AuthResponseData
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.css'],
})
export class SigninComponent {
  private authService = inject(AuthService);
  private userService = inject(UserService); // Keep if still needed for other logic
  private router = inject(Router);
  private fcmService = inject(FirebaseMessagingService);
  private platformId = inject(PLATFORM_ID);

  username = signal('');
  password = signal('');
  isSigningIn = false;
  isSigningInWithGoogle = false;

  constructor() {}

  async onLogin() {
    this.isSigningIn = true;
    let fcmToken: string | null = null;

    if (isPlatformBrowser(this.platformId)) {
      fcmToken = await this.fcmService.requestPermissionAndGetToken();
    }
    console.log(fcmToken);

    this.authService
      .login(this.username(), this.password(), fcmToken!)
      .subscribe({
        next: (res: AuthResponseData) => {
          // Type the response
          // ✅ FIX: Call onLoginSuccess directly with the response
          this.authService.onLoginSuccess(res);
          this.userService.getCurrentUser().subscribe({
            next: (user) => {
              if (isPlatformBrowser(this.platformId)) {
                localStorage.setItem('photoUrl', JSON.stringify(user.photoUrl));
              }
            },
            complete: () => {
              this.authService.onLoginSuccess(res);
            },
          });
        },
        error: (err) => {
          console.error('Login failed', err);
          // Handle error states
          this.isSigningIn = false;
        },
        complete: () => {
          this.isSigningIn = false;
          // No router.navigate here, AuthService will handle it
        },
      });
  }

  loginWithGoogle() {
    this.isSigningInWithGoogle = true;
    if (isPlatformBrowser(this.platformId)) {
      window.location.href =
        'http://localhost:8080/oauth2/authorization/google';
    }
  }
}
