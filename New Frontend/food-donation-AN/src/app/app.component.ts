// src/app/app.component.ts
import { Component, effect, inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { isPlatformBrowser, CommonModule } from '@angular/common'; // Import CommonModule

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
  private platformId = inject(PLATFORM_ID);
  isMobileSidebarOpen: boolean = false;

  constructor() {
    // This effect runs only in the browser environment to manage the loader
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        // This effect will run whenever `isAuthCheckComplete` changes
        if (this.authService.isAuthCheckComplete()) {
          // No need to remove an element from index.html anymore,
          // the @if block handles rendering/removing this div.
          console.log(
            'AppComponent: Auth check complete, loader status updated.'
          );
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
