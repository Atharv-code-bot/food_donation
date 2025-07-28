import { Component, EventEmitter, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, NavigationEnd, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HasRoleDirective } from '../directives/has-role.directive';
import { LucideAngularModule } from 'lucide-angular';
import { TokenService } from '../services/token.service';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PLATFORM_ID, Inject } from '@angular/core';
import { IsActiveMatchOptions } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, CommonModule, HasRoleDirective, LucideAngularModule, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() statusSelected = new EventEmitter<'AVAILABLE' | 'CLAIMED' | 'COLLECTED'>();
  @Output() toggleMobileSidebarEvent = new EventEmitter<void>();

  isCollapsed: boolean = true;
  role: string | null = null;

  private authService = inject(AuthService);
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private destroyRef = inject(DestroyRef);
  
  private isBrowser: boolean;
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.role = this.tokenService.getUserRole();
    }

    this.router.events.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      if (event instanceof NavigationEnd) {
        if (this.isBrowser) {
          this.role = this.tokenService.getUserRole();
        }
      }
    });
  }

  ngOnDestroy(): void {
    // takeUntilDestroyed handles subscriptions
  }

  selectStatus(status: 'AVAILABLE' | 'CLAIMED' | 'COLLECTED'): void {
    this.statusSelected.emit(status);
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.toggleMobileSidebarEvent.emit();
  }

  logout(): void {
    this.authService.logout();
  }

  /**
   * Helper function to check if the Dashboard link should be active.
   * It's active if the path is '/dashboard' AND status is NOT 'collected'.
   * @returns True if the Dashboard link is active.
   */
  isDashboardLinkActive(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    const currentUrlTree = this.router.parseUrl(this.router.url);
    const currentPath = currentUrlTree.root.children['primary']?.segments.map(s => s.path).join('/') || '';
    const currentQueryParams = currentUrlTree.queryParams;

    // Must be on /dashboard path
    const pathMatches = currentPath === 'dashboard';

    if (!pathMatches) {
      return false;
    }

    // If on /dashboard path, check query parameters
    if (currentQueryParams['status'] === 'collected') {
      return false; // Exclude when status is 'collected'
    }

    // Otherwise, if path is /dashboard and status is NOT 'collected', it's active.
    // This includes /dashboard, /dashboard?status=available, /dashboard?status=claimed, or other params.
    return true;
  }


  /**
   * Helper function to check if a router link is currently active for styling.
   * This handles exact path matches and query parameter subsets.
   * @param url The base URL to check (e.g., '/profile', '/dashboard/create').
   * @param exact If true, URL path must match exactly. If false, it's a path subset match.
   * @param queryParams Optional object of query params for *strict* subset matching.
   * @returns True if the link is active, false otherwise.
   */
  isLinkActive(url: string, exact: boolean, queryParams?: { [key: string]: any }): boolean {
    if (!this.isBrowser) {
      return false;
    }

    const currentUrlTree = this.router.parseUrl(this.router.url);
    const currentPath = currentUrlTree.root.children['primary']?.segments.map(s => s.path).join('/') || '';
    const currentQueryParams = currentUrlTree.queryParams;

    const targetPath = this.router.parseUrl(url).root.children['primary']?.segments.map(s => s.path).join('/') || '';

    // Check Path Matching
    let pathMatches: boolean;
    if (exact) {
      pathMatches = currentPath === targetPath;
    } else { // subset matching
      pathMatches = currentPath.startsWith(targetPath);
    }

    if (!pathMatches) {
      return false;
    }

    // Handle Query Parameter Matching
    if (queryParams) {
      // Check if current query params are a superset of target query params
      const targetKeys = Object.keys(queryParams);
      const allTargetQueryParamsPresent = targetKeys.every(key =>
        currentQueryParams[key] === queryParams![key]
      );
      return allTargetQueryParamsPresent;
    } else {
      // Default: Path matched, no specific query params requested.
      // Active only if there are NO query parameters on the current URL.
      // This is for links like /profile or /dashboard/create which should NOT be active if unexpected params exist.
      return Object.keys(currentQueryParams).length === 0;
    }
  }
}