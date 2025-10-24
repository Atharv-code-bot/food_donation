// src/app/services/auth.service.ts
import {
  computed,
  inject,
  Injectable,
  NgZone,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { AuthResponseData, RegisterRequestData } from '../auth/auth.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TokenService } from './token.service';
import { Router } from '@angular/router';
import { User } from './user.model';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs'; // ✅ FIX: Import Observable

@Injectable({ providedIn: 'root' })
export class AuthService {
  private httpClient = inject(HttpClient);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  private _isAuthCheckComplete = signal(false);
  isAuthCheckComplete = this._isAuthCheckComplete.asReadonly();

  private _isLoggedIn = signal(false);
  isLoggedIn = this._isLoggedIn.asReadonly();

  private _currentUser = signal<User | null>(null);
  currentUser = this._currentUser.asReadonly();

  userRoles = computed(() => {
    const user = this._currentUser();
    return user?.role ? [user.role] : [];
  });

  private platformId = inject(PLATFORM_ID);
  private isBrowserFlag: boolean;

  private _initialAuthCheckPromise: Promise<void>;
  private _resolveInitialAuthCheckPromise!: () => void;

  constructor() {
    this.isBrowserFlag = isPlatformBrowser(this.platformId);

    this._initialAuthCheckPromise = new Promise<void>((resolve) => {
      this._resolveInitialAuthCheckPromise = resolve;
    });

    if (!this.isBrowserFlag) {
      this._isAuthCheckComplete.set(true);
      this._isLoggedIn.set(false);
      this._resolveInitialAuthCheckPromise();
      console.log('AuthService: Running on server. Client-side auth deferred.');
    } else {
      this.ngZone.runOutsideAngular(() => {
        Promise.resolve().then(() => {
          this.ngZone.run(() => {
            this.initialAuthCheck();
            this._resolveInitialAuthCheckPromise();
          });
        });
      });
    }
  }

  get initialAuthPromise(): Promise<void> {
    return this._initialAuthCheckPromise;
  }

  login(username: string, password: string, fcmToken: string | null): Observable<AuthResponseData> {
    // ✅ FIX: Send username and password in the body
    const body = { username, password };
    
    // ✅ FIX: Send FCM token in the header
    let headers = new HttpHeaders();
    if (fcmToken) {
      headers = headers.set('X-Firebase-Token', fcmToken);
    }
    
    return this.httpClient.post<AuthResponseData>(
      'http://localhost:8080/auth/login',
      body,
      { headers } // ✅ FIX: Pass headers in the options object
    );
  }

  register(data: RegisterRequestData) {
    console.log('in register fn');
    return this.httpClient.post<AuthResponseData>(
      'http://localhost:8080/auth/register',
      data
    );
  }

  // ✅ FIX: saveSession is now a private helper
  private saveSession(data: AuthResponseData) {
    if (this.isBrowserFlag) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('id', data.id.toString());
      
      const decodedToken = this.tokenService.decodeToken(data.token);
      const userToSave: Partial<User> = {
        id: Number(data.id),
        role: data.role,
        username: decodedToken?.sub || decodedToken?.username || null,
        email: decodedToken?.email || null,
      };
      if (isPlatformBrowser(this.platformId)){
        localStorage.setItem('user', JSON.stringify(userToSave));
      }
      console.log("AuthService: Minimal user object constructed from login data/JWT and saved.");
    }
  }

  logout() {
    if (this.isBrowserFlag) {
      this.tokenService.clearToken();
      this._isLoggedIn.set(false);
      this._currentUser.set(null);
      this.router.navigate(['/auth/signin']);
    }
  }

  private initialAuthCheck(): void {
    const token = this.tokenService.getToken();
    const isExpired = this.tokenService.isTokenExpired();

    if (token && !isExpired) {
      console.log('AuthService: Token found and valid during initial check.');
      this._isLoggedIn.set(true);
      if (this.isBrowserFlag) {
        const userFromLocalStorage = this.tokenService.getUser();
        if (userFromLocalStorage) {
          this._currentUser.set(userFromLocalStorage);
          console.log('AuthService: _currentUser populated from localStorage.');
        } else {
          console.warn('AuthService: No full user object found in localStorage for _currentUser.');
          this._currentUser.set(null);
        }
      }
    } else {
      console.log(`AuthService: ${token ? 'Token expired' : 'No token'} during initial check.`);
      this.tokenService.clearToken();
      this._isLoggedIn.set(false);
      this._currentUser.set(null);
    }
    this._isAuthCheckComplete.set(true);
  }

  // ✅ FIX: onLoginSuccess is now a public method that handles saving and redirecting
  // It is the single entry point for components to handle a successful auth event.
  onLoginSuccess(authData: AuthResponseData): void {
      if (!this.isBrowserFlag) {
          console.warn('onLoginSuccess called on server, skipping.');
          return;
      }
      
      this.saveSession(authData);
      this.initialAuthCheck();
      
      if (this.isLoggedIn()) {
          const userRole = this.tokenService.getUserRole();
          if (userRole === 'ROLE_OAUTH2_USER') {
              this.router.navigate(['/auth/complete-profile']);
          } else {
              this.router.navigate(['/dashboard']);
          }
      } else {
          console.warn('AuthService: onLoginSuccess failed to log in, redirecting to signin.');
          this.tokenService.clearToken();
          this.router.navigate(['/auth/signin']);
      }
  }
}