import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TokenService } from '../services/token.service';
import { UserService } from '../services/user.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-header',
  imports: [RouterLink, CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  constructor(
    private tokenService: TokenService,
    private userService: UserService,
    private sanitizer: DomSanitizer
  ) {}
  isLoggedIn = false;
  profileImageUrl: any;
  openDropDown = false;

  ngOnInit() {
    this.isLoggedIn = !this.tokenService.isTokenExpired();
    const photoUrl = localStorage.getItem('photoUrl');
    if (photoUrl) {
      this.loadImage(JSON.parse(photoUrl));
    }
  }

  loadImage(photoUrl: string) {
    if (!photoUrl) return;

    this.userService.getUserImage(photoUrl).subscribe({
      next: (blob) => {
        const objectURL = URL.createObjectURL(blob);
        this.profileImageUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
      },
      error: (err) => {
        console.error('❌ Error loading profile image:', err);
      },
    });
  }
}
