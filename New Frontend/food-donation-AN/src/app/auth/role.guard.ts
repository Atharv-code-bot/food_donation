// src/app/auth/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

/**
 * A guard to check if the current user has one of the allowed roles.
 * @param allowedRoles An array of role strings (e.g., ['ROLE_DONOR', 'ROLE_ADMIN']).
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const tokenService = inject(TokenService); // Assuming TokenService has getUserRole method
  const allowedRoles = route.data['allowedRoles'] as string[];

  const userRole = tokenService.getUserRole();
  
  if (authService.isLoggedIn() && userRole && allowedRoles.includes(userRole)) {
    return true; // User is logged in and has a valid role
  }

  // If not authorized, redirect to dashboard or access denied page
  console.warn('Access denied. User does not have a required role.');
  router.navigate(['/dashboard']); 
  return false;
};