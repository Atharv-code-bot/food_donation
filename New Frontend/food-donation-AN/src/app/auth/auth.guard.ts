// src/app/auth/auth.guard.ts
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';
import { from } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);
  
  const isBrowserFlag = isPlatformBrowser(platformId);
  
  if (!isBrowserFlag) {
    console.log('AuthGuard: Running on server. Allowing route to render for hydration.');
    return true;
  }
  
  return from(authService.initialAuthPromise).pipe(
    tap(() => console.log('AuthGuard (Client): Initial auth check promise resolved.')),
    map(() => {
      const isLoggedIn = authService.isLoggedIn();
  
      console.log('AuthGuard (Client): Final check. LoggedIn:', isLoggedIn);
  
      if (isLoggedIn) {
        return true;
      } else {
        if (tokenService.getToken()) {
          tokenService.clearToken();
          console.log('AuthGuard (Client): Cleared potentially stale token.');
        }
        router.navigate(['/auth/signin']);
        return false;
      }
    }),
    catchError(error => {
      console.error('AuthGuard (Client): Error during initial auth promise, redirecting to signin.', error);
      router.navigate(['/auth/signin']);
      return from([false]);
    })
  );
};