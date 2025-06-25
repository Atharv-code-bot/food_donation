import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  getToken(): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem('token');
    }
    return null;
  }

  setToken(token: string): void {
    if (this.isBrowser()) {
      localStorage.setItem('token', token);
    }
  }

  clearToken(): void {
    if (this.isBrowser()) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('id');
    }
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const { exp } = jwtDecode<{ exp: number }>(token);
      return exp < Math.floor(Date.now() / 1000);
    } catch {
      return true;
    }
  }

  getUserRole(): string | null {
    const token = this.getToken();
    console.log(token);
    if (!token) return null;

    try {
      const { role } = jwtDecode<{ role: string }>(token);
      console.log(role);
      return role || null;
    } catch {
      return null;
    }
  }

  getUserId(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const { id } = jwtDecode<{ id: string }>(token);
      return id || null;
    } catch {
      return null;
    }
  }

  getFullName(): string {
    const user = this.getUser();
    return user?.fullname || 'User';
  }

  getProfileImage(): string {
    const user = this.getUser();
    return user?.photoUrl
      ? `http://localhost:8080${user.photoUrl}`
      : 'default.jpg';
  }

  getRoleReadable(): string {
    const user = this.getUser();
    return user?.role?.replace('ROLE_', '') || '';
  }

  private getUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  hasRole(expectedRole: string): boolean {
    return this.getUserRole() === expectedRole;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.includes(this.getUserRole() || '');
  }
}
