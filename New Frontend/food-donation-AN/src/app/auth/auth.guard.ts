import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';

export const authGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const token = tokenService.getToken();

  console.log('Guard check:', {
    token,
    expired: tokenService.isTokenExpired(),
  });

  if (token) { 
    if (tokenService.isTokenExpired()) {
      tokenService.clearToken();
      router.navigate(['/auth/signin']);
      return false;
    }
    return true;
  } else {
    router.navigate(['/auth/signin']);
    return false;
  }
};
