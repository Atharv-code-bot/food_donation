// src/app/auth/oauth2-redirect/oauth2-redirect.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '../../services/token.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../services/user.model'; // Import your User interface

@Component({
  selector: 'app-oauth2-redirect',
  template: `<p>Redirecting securely...</p>`,
  standalone: true,
})
export class OAuth2RedirectComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tokenService = inject(TokenService); // Keep if needed for local vars
  private authService = inject(AuthService);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const role = this.route.snapshot.queryParamMap.get('role');
    const userId = this.route.snapshot.queryParamMap.get('id');
    const photoUrl = this.route.snapshot.queryParamMap.get('photoUrl'); // If backend sends directly
    const userJson = this.route.snapshot.queryParamMap.get('user'); // ✅ If backend sends stringified user JSON

    let userObj: User | undefined;
    if (userJson) {
      try {
        userObj = JSON.parse(userJson);
      } catch (e) {
        console.error('OAuth2RedirectComponent: Failed to parse user JSON from query param:', e);
      }
    }

    if (token) {
      this.authService.onLoginSuccess({
          token: token,
          role: role || '',
          id: userId || '',
          photoUrl: photoUrl || undefined, // Pass photoUrl if available
          user: userObj // ✅ Pass the parsed user object
      });
    } else {
      console.error('OAuth2 redirect: No token received. Redirecting to signup.');
      this.router.navigate(['/auth/signup']);
    }
  }
}