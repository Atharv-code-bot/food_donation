import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '../../services/token.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-oauth2-redirect',
  template: `<p>Redirecting...</p>`,
})
export class OAuth2RedirectComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tokenService: TokenService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const role = this.route.snapshot.queryParamMap.get('role');

    if (token) {
      this.tokenService.setToken(token); // store token in localStorage
      if (role === 'ROLE_OAUTH2_USER') {
        this.router.navigate(['/auth/complete-profile']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } else {
      this.router.navigate(['/auth/signup']);
    }
  }
}
