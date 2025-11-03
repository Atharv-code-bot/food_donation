import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { User } from './user.model';
import { environment } from '../../environments/environment'; // This automatically selects the correct file

@Injectable({ providedIn: 'root' })
export class TokenService {
  private API_URL = environment.apiUrl;
  isBrowser(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  // ✅ New method to get and set the FCM token
  getFCMToken(): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem('fcm_token');
    }
    return null;
  }

  setFCMToken(token: string): void {
    if (this.isBrowser()) {
      localStorage.setItem('fcm_token', token);
    }
  }

  clearFCMToken(): void {
    if (this.isBrowser()) {
      // ... (existing token clearing logic) ...
      localStorage.removeItem('fcm_token'); // ✅ Clear FCM token on logout
    }
  }

      // ✅ New methods to handle latitude and longitude
    setCoordinates(latitude: string, longitude: string): void {
        if (this.isBrowser()) {
            localStorage.setItem('latitude', latitude);
            localStorage.setItem('longitude', longitude);
        }
    }
    
    getCoordinates(): { latitude: string | null, longitude: string | null } {
        if (this.isBrowser()) {
            return {
                latitude: localStorage.getItem('latitude'),
                longitude: localStorage.getItem('longitude')
            };
        }
        return { latitude: null, longitude: null };
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
      localStorage.removeItem('photoUrl');
      localStorage.removeItem('donorFirstTimePopupShown');
      localStorage.removeItem('user'); // ✅ FIX: Clear the 'user' item too!
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

  // ✅ Add a helper to decode JWT payload
  decodeToken(token: string): any | null {
    try {
      return jwtDecode(token);
    } catch (e) {
      console.error('Failed to decode token:', e);
      return null;
    }
  }

  getUserRole(): string | null {
    // This now relies on `AuthService`'s `_currentUser` or the role from local storage/token if `_currentUser` is null.
    // For simplicity, directly read from localStorage 'role' if this is critical and not reliant on _currentUser.
    // OR, get it from token claims if role is always in token and user object is not critical.
    const token = this.getToken();
    if (token) {
      const decoded = this.decodeToken(token);
      return decoded?.role || null; // Assuming role is a direct claim
    }
    return null;
  }

  getUserId(): string | null {
    const token = this.getToken();
    if (token) {
        const decoded = this.decodeToken(token);
        return decoded?.id?.toString() || null; // Assuming id is a direct claim
    }
    return null;
  }

  getFullName(): string {
    const user = this.getUser();
    return user?.fullname || user?.username || 'User'; // Fallback to username
  }

  getProfileImage(): string {
    const user = this.getUser();
    return user?.photoUrl
      ? `${this.API_URL}${user.photoUrl}`
      : 'default.jpg';
  }

  getRoleReadable(): string {
    const user = this.getUser();
    return user?.role?.replace('ROLE_', '') || '';
  }

  // ✅ FIX: Less strict getUser method
  // This method's primary purpose is to return what's in localStorage 'user' key.
  // It should not validate completeness if AuthService doesn't rely on it.
  getUser(): User | null {
    // Return type User | null
    if (this.isBrowser()) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userObj: User = JSON.parse(userStr);
          // ✅ REMOVE STRICT VALIDATION HERE.
          // AuthService will handle if essential data is missing for its _currentUser.
          return userObj;
        } catch (e) {
          console.error(
            'TokenService: Failed to parse user object from localStorage. Returning null.',
            e
          );
          return null;
        }
      }
    }
    return null;
  }

  hasRole(expectedRole: string): boolean {
    return this.getUserRole() === expectedRole;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.includes(this.getUserRole() || '');
  }

  isFirstTimeNgo(): boolean {
    return true;
  }
}
