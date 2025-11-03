// src/app/app.component.ts
import { Component, effect, inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { isPlatformBrowser, CommonModule } from '@angular/common'; // Import CommonModule
import { FirebaseMessagingService } from './services/firebase-messaging.service';
import { TokenService } from './services/token.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule], // Ensure CommonModule is here for @if
  template: `
    @if (!authService.isAuthCheckComplete()) {
    <div class="app-loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading FoodBridge...</p>
    </div>
    } @else {
    <router-outlet></router-outlet>
    }
  `,
  styleUrl: './app.component.css', // This CSS file will contain the loader styles
})
export class AppComponent {
  title = 'FoodBridge';
  authService = inject(AuthService);
  tokenService = inject(TokenService);
  private platformId = inject(PLATFORM_ID);
  fcmService = inject(FirebaseMessagingService);
  isMobileSidebarOpen: boolean = false;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        if (this.authService.isAuthCheckComplete()) {
          console.log(
            'AppComponent: Auth check complete, loader status updated.'
          );
        }
      });
      // ✅ Get FCM token and store it at app startup
      this.fcmService.requestPermissionAndGetToken().then((fcmToken) => {
        if (fcmToken) {
          console.log(
            'FCM token acquired at startup. Storing in localStorage.'
          );
          this.tokenService.setFCMToken(fcmToken); // ✅ New method in TokenService
        }
      });
    }
  }
  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }
}
