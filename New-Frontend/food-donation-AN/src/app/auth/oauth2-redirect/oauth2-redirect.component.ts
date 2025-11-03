// src/app/auth/oauth2-redirect/oauth2-redirect.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '../../services/token.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../services/user.model';
import { AuthResponseData } from '../auth.model';

@Component({
  selector: 'app-oauth2-redirect',
  template: `<p>Redirecting securely...</p>`,
  standalone: true,
})
export class OAuth2RedirectComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const role = this.route.snapshot.queryParamMap.get('role');
    const userId = this.route.snapshot.queryParamMap.get('id');
    const fullname = this.route.snapshot.queryParamMap.get('fullname');
    const photoUrl = this.route.snapshot.queryParamMap.get('photoUrl');

    if (token) {
      // ✅ FIX: Pass the properties directly as a single object
      this.authService.onLoginSuccess({
        token: token,
        role: role || '',
        id: userId || '',
      });
    } else {
      console.error('OAuth2 redirect: No token received. Redirecting to signup.');
      this.router.navigate(['/auth/signup']);
    }
  }
}