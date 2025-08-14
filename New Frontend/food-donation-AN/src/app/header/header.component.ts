import { CommonModule } from '@angular/common';
import { Component, ViewChild, PLATFORM_ID, inject, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TokenService } from '../services/token.service';
import { UserService } from '../services/user.service';
import { DomSanitizer } from '@angular/platform-browser';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { AuthService } from '../services/auth.service';
import { AvatarModule } from 'primeng/avatar';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { OverlayPanel } from 'primeng/overlaypanel';
import { LucideAngularModule } from 'lucide-angular';
import { isPlatformBrowser } from '@angular/common';

interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
}

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    CommonModule,
    BadgeModule,
    OverlayBadgeModule,
    MenuModule,
    AvatarModule,
    OverlayPanelModule,
    LucideAngularModule,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  @ViewChild('notificationPanel') notificationPanel!: OverlayPanel;
  notifications: Notification[] = [];
  unreadCount = 0;
  photoUrl: string | null = null;

  private isBrowser: boolean;
  private platformId = inject(PLATFORM_ID);
  constructor(
    private tokenService: TokenService,
    private userService: UserService,
    private sanitizer: DomSanitizer,
    private authService: AuthService
  ) {
    this.loadNotifications();
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  isLoggedIn = false;
  profileImageUrl: any;
  openDropDown = false;
  // profileImageUrl =
  //   'https://primefaces.org/cdn/primeng/images/demo/avatar/amyelsner.png';
  @Output() toggleSidebarEvent = new EventEmitter<void>(); // ✅ New Output event

  toggleMobileSidebar(): void {
    this.toggleSidebarEvent.emit(); // Emit event when hamburger is clicked
  }

  avatarMenuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      routerLink: ['/dashboard'],
    },
    {
      label: 'Profile',
      icon: 'pi pi-user',
      routerLink: ['/profile'],
    },
    {
      label: 'Sign Out',
      icon: 'pi pi-sign-out',
      command: () => this.signOut(),
    },
  ];

  signOut() {
    console.log('Signing out...');
    this.authService.logout(); // clear token
    // Add your sign out logic here
  }

  loadNotifications() {
    // Simulate fetch from API
    this.notifications = [
      {
        id: 1,
        title: 'Donation Approved',
        message: 'Your donation was approved.',
        read: false,
      },
      {
        id: 2,
        title: 'New Request',
        message: 'An NGO requested your donation.',
        read: false,
      },
      {
        id: 3,
        title: 'System Alert',
        message: 'Maintenance at 10 PM.',
        read: true,
      },
    ];
    this.updateUnreadCount();
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter((n) => !n.read).length;
  }

  markAsRead(notification: Notification) {
    notification.read = true;
    this.updateUnreadCount();
  }

  addNotification(title: string, message: string) {
    const newNotif: Notification = {
      id: Date.now(),
      title,
      message,
      read: false,
    };
    this.notifications.unshift(newNotif);
    this.updateUnreadCount();
  }

  ngOnInit() {
    this.isLoggedIn = !this.tokenService.isTokenExpired();
    if (this.isBrowser) {
      const photoUrl = localStorage.getItem('photoUrl');
      if (photoUrl) {
        this.loadImage(JSON.parse(photoUrl));
      } else {
        // Retry after a short delay
        setTimeout(() => {
          const delayedPhotoUrl = localStorage.getItem('photoUrl');
          if (delayedPhotoUrl) {
            this.loadImage(JSON.parse(delayedPhotoUrl));
          }
        }, 200); // Adjust delay as needed
      }
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
