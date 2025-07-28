// src/app/services/auth.service.ts
import {
  computed,
  inject,
  Injectable,
  NgZone, // Keep NgZone if you plan to use it for tasks outside Angular's zone
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { AuthResponseData, RegisterRequestData } from '../auth/auth.model';
import { HttpClient } from '@angular/common/http';
import { TokenService } from './token.service';
import { Router } from '@angular/router';
import { User } from './user.model'; // Your User model
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private httpClient = inject(HttpClient);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  private ngZone = inject(NgZone); // Inject NgZone

  // Signal to track if the initial auth check is complete
  private _isAuthCheckComplete = signal(false);
  isAuthCheckComplete = this._isAuthCheckComplete.asReadonly();

  private _isLoggedIn = signal(false); // To track actual login status
  isLoggedIn = this._isLoggedIn.asReadonly();

  private _currentUser = signal<User | null>(null);
  currentUser = this._currentUser.asReadonly();

  userRoles = computed(() => {
    const user = this._currentUser();
    return user?.role ? [user.role] : [];
  });

  private platformId = inject(PLATFORM_ID);
  private isBrowserFlag: boolean;

  // A private Promise that resolves once the initial auth check has truly settled.
  // This is used by the authGuard to wait.
  private _initialAuthCheckPromise: Promise<void>;
  private _resolveInitialAuthCheckPromise!: () => void;

  constructor() {
    this.isBrowserFlag = isPlatformBrowser(this.platformId);

    // Initialize the promise immediately.
    this._initialAuthCheckPromise = new Promise<void>((resolve) => {
      this._resolveInitialAuthCheckPromise = resolve;
    });

    if (!this.isBrowserFlag) {
      // On server, set complete immediately and assume not logged in.
      this._isAuthCheckComplete.set(true); // Signal completion for SSR
      this._isLoggedIn.set(false); // Assume not logged in on server
      this._resolveInitialAuthCheckPromise(); // Resolve promise immediately on server
      console.log(
        'AuthService: Running on server. Client-side auth deferred.'
      );
    } else {
      // Client-side initial check with a slight, reliable delay
      this.ngZone.runOutsideAngular(() => {
        Promise.resolve().then(() => {
          this.ngZone.run(() => {
            this.initialAuthCheck(); // Perform the actual check
            this._resolveInitialAuthCheckPromise(); // Resolve the promise
          });
        });
      });
    }
  }

  // Exposed method for authGuard to wait on.
  get initialAuthPromise(): Promise<void> {
    return this._initialAuthCheckPromise;
  }

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

  // This is used by standard login. OAuth2Redirect will set directly.
  saveSession(data: AuthResponseData) {
    if (this.isBrowserFlag) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('id', data.id.toString());
      // localStorage.setItem('photoUrl', data.photoUrl || '');
      // ✅ MODIFIED: Do not strictly require `data.user` here.
      // If backend sends a `user` object, save it, otherwise, don't worry.
      
        // Fallback: If no user object from backend, create a minimal one from JWT claims for TokenService.getUser()
        // This makes sure TokenService.getUser() doesn't return null if only token/role/id is available.
        const decodedToken = this.tokenService.decodeToken(data.token);
        const userToSave: Partial<User> = { // Use Partial<User>
            id: Number(data.id),
            role: data.role,
            username: decodedToken?.sub || decodedToken?.username || null, // Common JWT claim for username
            email: decodedToken?.email || null,
            // Only include fields known from AuthResponseData or JWT
            // fullname will be null unless explicitly fetched/provided
            // Ensure this aligns with what TokenService.getUser expects.
        };
        localStorage.setItem('user', JSON.stringify(userToSave));
        console.log("AuthService: Minimal user object constructed from login data/JWT and saved.");
    }
  }

  logout() {
    if (this.isBrowserFlag) {
      this.tokenService.clearToken();
      this._isLoggedIn.set(false);
      this._currentUser.set(null);
      this.router.navigate(['/auth/signin']);
      // window.location.href = '/auth/signin';
    }
  }

  private initialAuthCheck(): void {
    // This runs ONLY on the client due to the constructor's if(isBrowserFlag)
    const token = this.tokenService.getToken();
    const isExpired = this.tokenService.isTokenExpired();

    // ✅ FIX: Determine _isLoggedIn SOLELY based on token validity.
    if (token && !isExpired) {
      console.log('AuthService: Token found and valid during initial check.');
      this._isLoggedIn.set(true);
      // ✅ FIX: Attempt to load _currentUser, but its failure won't log out.
      if (this.isBrowserFlag) {
        const userFromLocalStorage = this.tokenService.getUser();
        if (userFromLocalStorage) {
          this._currentUser.set(userFromLocalStorage);
          console.log('AuthService: _currentUser populated from localStorage.');
        } else {
          console.warn('AuthService: No full user object found in localStorage for _currentUser.');
          this._currentUser.set(null); // Explicitly set to null if not found
          // We are NOT logging out here, as the token is valid.
        }
      }
    } else {
      console.log(
        `AuthService: ${token ? 'Token expired' : 'No token'} during initial check. Logging out.`
      );
      this.tokenService.clearToken(); // Always clear if no token or expired
      this._isLoggedIn.set(false);
      this._currentUser.set(null);
    }

    this._isAuthCheckComplete.set(true); // Mark check as complete after client-side check
  }

  // This method is called from OAuth2RedirectComponent or standard login success.
  onLoginSuccess(authData?: {
    token: string;
    role: string;
    id: string;
    photoUrl?: string;
    user?: User; // Add optional user data here if backend sends it
    // Other direct claims from JWT if not in user object directly
    username?: string;
    email?: string;
  }): void {
    if (!this.isBrowserFlag) {
      console.warn('onLoginSuccess called on server, skipping.');
      return;
    }

    // ✅ FIX: Ensure all relevant data is saved reliably from authData
    if (authData) {
      this.tokenService.setToken(authData.token); // Store new token
      if (authData.role) localStorage.setItem('role', authData.role);
      if (authData.id) localStorage.setItem('id', authData.id);
      if (authData.photoUrl) localStorage.setItem('photoUrl', authData.photoUrl);

      // ✅ FIX: Save user object from authData or construct minimal one
      if (authData.user) {
          localStorage.setItem('user', JSON.stringify(authData.user));
          console.log("AuthService: Full user object from onLoginSuccess saved to localStorage.");
      } else {
          // Construct minimal user object if a full 'user' wasn't provided
          const userToSave: Partial<User> = {
              id: Number(authData.id),
              role: authData.role,
              username: authData.username || this.tokenService.decodeToken(authData.token)?.sub || null,
              email: authData.email || this.tokenService.decodeToken(authData.token)?.email || null,
              photoUrl: authData.photoUrl || null,
              // Other fields will be null
          };
          localStorage.setItem('user', JSON.stringify(userToSave));
          console.log("AuthService: Minimal user object constructed from onLoginSuccess data/JWT and saved.");
      }
    }

    // ✅ FIX: Force a re-evaluation of auth state now that localStorage is updated.
    this.initialAuthCheck(); // This will now find the reliably saved token and user data.

    // ✅ FIX: Perform navigation based on the LATEST and STABLE isLoggedIn state.
    if (this.isLoggedIn()) { // Check the signal *after* initialAuthCheck()
      const userRole = this.tokenService.getUserRole(); // Read role from the now stable tokenService
      if (userRole === 'ROLE_OAUTH2_USER') {
        this.router.navigate(['/auth/complete-profile']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } else {
      // Fallback: If despite setting token, user isn't logged in (e.g., token instantly expired)
      console.warn('AuthService: onLoginSuccess failed to log in, redirecting to signin.');
      this.tokenService.clearToken(); // Clear token if login didn't succeed internally
      this.router.navigate(['/auth/signin']);
    }
  }
}