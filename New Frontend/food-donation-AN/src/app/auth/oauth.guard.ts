// src/app/auth/oauth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';
import { jwtDecode } from 'jwt-decode';

export const OAuthGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  const token = tokenService.getToken();
  if (!token) {
    router.navigate(['/auth/signup']);
    return false;
  }

  try {
    const decoded: any = jwtDecode(token);
    if (decoded?.role === 'ROLE_OAUTH2_USER' && (!decoded?.phone || !decoded?.address)) {
      // The guard logic seems to be checking for missing phone or address
      // which is typically what happens for an OAuth2 first-timer.
      return true;
    }
  } catch (e) {
    console.error("OAuthGuard: Invalid token during activation.", e);
    tokenService.clearToken();
    router.navigate(['/auth/signin']);
    return false;
  }

  // If the user is not a first-time OAuth2 user, redirect to dashboard.
  router.navigate(['/dashboard']);
  return false;
};