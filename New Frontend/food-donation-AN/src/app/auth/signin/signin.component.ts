import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
@Component({
  selector: 'app-signin',
  imports: [FormsModule, RouterLink],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.css',
})
export class SigninComponent {
  private authService = inject(AuthService);
  private userService = inject(UserService)
  private router = inject(Router);
  username = signal('');
  password = signal('');
  onLogin() {
    this.authService.login(this.username(), this.password()).subscribe({
      next: (res) => {
        this.authService.saveSession(res);
        this.userService.getCurrentUser().subscribe({
          next: (user) => {
            localStorage.setItem('photoUrl', JSON.stringify(user.photoUrl));
          }})
        this.router.navigate(['/dashboard']);
      },

      error: (err) => {
        console.error('Login failed', err);
      },
    });
  }

  loginWithGoogle() {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  }
}
