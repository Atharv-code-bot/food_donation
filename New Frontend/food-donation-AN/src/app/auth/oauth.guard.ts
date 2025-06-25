import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { TokenService } from '../services/token.service';
import { jwtDecode } from 'jwt-decode';

@Injectable({ providedIn: 'root' })
export class OAuthGuard implements CanActivate {
  constructor(private tokenService: TokenService, private router: Router) {}

  canActivate(): boolean {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/signup']);
      return false;
    }

    const decoded: any = jwtDecode(token);
    if (
      decoded?.role === 'ROLE_OAUTH2_USER' &&
      (!decoded?.phone || !decoded?.address)
    ) {
      return true;
    }

    this.router.navigate(['/dashboard']);
    return false;
  }
}
