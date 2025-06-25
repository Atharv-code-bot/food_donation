import { inject, Injectable } from '@angular/core';
import { AuthResponseData, RegisterRequestData } from '../auth/auth.model';
import { HttpClient } from '@angular/common/http';
import { TokenService } from './token.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private httpClient = inject(HttpClient);
  private tokenService = inject(TokenService);
  constructor(private router: Router) {}

  login(username: string, password: string) {
    const body = { username, password };
    return this.httpClient.post<AuthResponseData>(
      'http://localhost:8080/auth/login',
      body
    );
  }

  register(data: RegisterRequestData) {
    console.log('in register fn');
    return this.httpClient.post<AuthResponseData>(
      'http://localhost:8080/auth/register',
      data
    );
  }
  saveSession(data: AuthResponseData) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('id', data.id.toString());
  }
  logout() {
    this.tokenService.clearToken();

    // Hard redirect ensures guard is not triggered again
    window.location.href = '/auth/signin';
  }
}
