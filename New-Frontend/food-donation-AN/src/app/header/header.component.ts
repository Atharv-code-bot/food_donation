import { CommonModule, isPlatformBrowser, DatePipe } from '@angular/common';
import { Component, ViewChild, PLATFORM_ID, inject, Output, EventEmitter, OnInit } from '@angular/core';
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
import { PopoverModule } from 'primeng/popover';
import { Popover } from 'primeng/popover';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, take, tap } from 'rxjs/operators'; 
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { NotificationService, ApiNotification } from '../services/notification.service';
import { of, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    CommonModule,
    BadgeModule,
    OverlayBadgeModule,
    MenuModule,
    AvatarModule,
    PopoverModule,
    LucideAngularModule,
    ToastModule,
    DatePipe,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  providers: [MessageService],
})
export class HeaderComponent implements OnInit {
  @ViewChild('notificationPanel') notificationPanel!: Popover;

  notifications: ApiNotification[] = [];
  unreadCount: number = 0;
  photoUrl: string | null = null;
  isLoggedIn = false;
  profileImageUrl: any;
  openDropDown = false;
  
  // ✅ FIX: Properties for collapsible sections
  showUnread = true;
  showRead = true;

  @Output() toggleSidebarEvent = new EventEmitter<void>();

  private isBrowser: boolean;
  private platformId = inject(PLATFORM_ID);

  constructor(
    private tokenService: TokenService,
    private userService: UserService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private messageService: MessageService,
    private notificationService: NotificationService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  avatarMenuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', routerLink: ['/dashboard'] },
    { label: 'Profile', icon: 'pi pi-user', routerLink: ['/profile'] },
    { label: 'Sign Out', icon: 'pi pi-sign-out', command: () => this.signOut() },
  ];

  toggleMobileSidebar(): void {
    this.toggleSidebarEvent.emit();
  }

  signOut() {
    console.log('Signing out...');
    this.authService.logout();
  }
  
  ngOnInit() {
    this.isLoggedIn = !this.tokenService.isTokenExpired();
    if (this.isBrowser && this.isLoggedIn) {
      this.fetchUnreadCount();
      this.photoUrl = localStorage.getItem('photoUrl');
    }
  }

  fetchUnreadCount() {
    this.notificationService.getUnreadCount().pipe(
      take(1),
      catchError((err: HttpErrorResponse) => {
        console.error('Failed to fetch unread count:', err);
        this.messageService.add({severity:'error', summary:'Error', detail:'Failed to load notification count.'});
        return of(0);
      })
    ).subscribe(count => {
      this.unreadCount = count;
    });
  }

  loadNotificationsAndShow(event: Event) {
    if (this.isBrowser && this.isLoggedIn) {
      this.notificationService.getNotifications().pipe(
        take(1),
        tap(() => this.notificationPanel.toggle(event)),
        catchError((err: HttpErrorResponse) => {
          console.error('Failed to fetch notifications:', err);
          this.messageService.add({severity:'error', summary:'Error', detail:'Failed to load notifications.'});
          return of([]);
        })
      ).subscribe((notifs: ApiNotification[]) => {
        this.notifications = notifs.sort((a: ApiNotification, b: ApiNotification) => {
          const dateA = this.convertToDate(a.createdAt);
          const dateB = this.convertToDate(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        this.updateUnreadCount();
      });
    } else {
      this.notificationPanel.toggle(event);
    }
  }

  convertToDate(dateArray: number[]): Date {
    return new Date(
      dateArray[0],
      dateArray[1] - 1,
      dateArray[2],
      dateArray[3],
      dateArray[4],
      dateArray[5],
      dateArray[6] / 1000000
    );
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter((n) => !n.read).length;
  }

  markAsRead(notification: ApiNotification) {
    if (notification.read) {
      return;
    }
    this.notificationService.markAsRead(notification.id).pipe(
      take(1),
      catchError(err => {
        console.error('Failed to mark notification as read:', err);
        this.messageService.add({severity:'error', summary:'Error', detail:'Failed to update notification status.'});
        return of(null);
      })
    ).subscribe(() => {
      notification.read = true;
      this.updateUnreadCount();
    });
  }

  // loadImage(photoUrl: string) {
  //   if (!photoUrl) return;
  //   this.userService.getUserImage(photoUrl).subscribe({
  //     next: (blob) => {
  //       const objectURL = URL.createObjectURL(blob);
  //       this.profileImageUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
  //     },
  //     error: (err) => {
  //       console.error('❌ Error loading profile image:', err);
  //     },
  //   });
  // }
}