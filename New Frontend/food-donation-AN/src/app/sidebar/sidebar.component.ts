import { Component, EventEmitter, Output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  @Output() statusSelected = new EventEmitter<
    'AVAILABLE' | 'CLAIMED' | 'COLLECTED'
  >();

  selectStatus(status: 'AVAILABLE' | 'CLAIMED' | 'COLLECTED') {
    this.statusSelected.emit(status);
  }
  constructor(private authService: AuthService, private router: Router) {}

  isCollapsed = false;

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  logout() {
    this.authService.logout(); // clear token
  }
}
