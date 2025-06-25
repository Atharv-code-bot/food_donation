import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { WritableSignal } from '@angular/core';

import { DashboardService } from '../../services/dashboard.service';
import { donation } from '../donation.model';
import { HasRoleDirective } from '../../directives/has-role.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TokenService } from '../../services/token.service';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HeaderComponent } from '../../header/header.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-donation-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    HasRoleDirective,
    SidebarComponent,
    HeaderComponent,
    CommonModule,
  ],
  templateUrl: './donation-list.component.html',
  styleUrl: './donation-list.component.css',
})
export class DonationListComponent implements OnInit {
  donations = signal<donation[] | undefined>(undefined);
  public tokenService = inject(TokenService);
  isFetching = signal(false);
  error = signal('');
  selectedStatus = signal<'AVAILABLE' | 'CLAIMED' | 'COLLECTED'>('AVAILABLE');
  role = this.tokenService.getUserRole();

  sortField: keyof donation = 'donationId';
  sortDirections = new Map<keyof donation, 'asc' | 'desc'>();

  private route = inject(ActivatedRoute);

  private dashboardService = inject(DashboardService);
  private destroyRef = inject(DestroyRef);

  constructor(
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    const sortableFields: (keyof donation)[] = [
      'donationId',
      'itemName',
      'quantity',
      'createdAt', // or 'donationDate' if renamed in template
      // add more if you enable sorting for them
    ];

    for (const field of sortableFields) {
      this.sortDirections.set(field, 'asc');
    }

    // Set default sort field
    this.sortField = 'donationId';
    this.sortDonations(); // optional: sort initially

    console.log(this.role);
    this.route.queryParams.subscribe((params) => {
      const rawStatus = params['status']?.toUpperCase();
      const validStatuses = ['AVAILABLE', 'CLAIMED', 'COLLECTED'];
      const status = validStatuses.includes(rawStatus)
        ? rawStatus
        : 'AVAILABLE';
      this.selectedStatus.set(status as any);
      this.fetchDonations(status as 'AVAILABLE' | 'CLAIMED' | 'COLLECTED');
    });
  }

  selectStatus(status: 'AVAILABLE' | 'CLAIMED' | 'COLLECTED'): void {
    this.selectedStatus.set(status);
    this.fetchDonations(status);
  }

  private fetchDonations(status: 'AVAILABLE' | 'CLAIMED' | 'COLLECTED'): void {
    console.log('Fetching donations with status:', status);
    this.isFetching.set(true);
    this.dashboardService
      .loadDonations(status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (donations) => {
          this.donations.set(donations);
          this.error.set('');
        },
        error: (error: Error) => {
          this.error.set(error.message);
        },
        complete: () => {
          this.isFetching.set(false);
        },
      });
  }

  // For toggling sorting on header click
  toggleSort(field: keyof donation): void {
    // Toggle direction only for this field
    const currentDir = this.sortDirections.get(field) || 'asc';
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';
    console.log(`Toggling sort for ${field}: ${currentDir} -> ${newDir}`);
    this.sortDirections.set(field, newDir);

    this.sortField = field;
    this.sortDonations();
  }

  // Sort function that updates the signal correctly
  sortDonations(): void {
    const field = this.sortField;
    const direction = this.sortDirections.get(field) || 'asc';
    const data = this.donations();

    if (!data) return;

    const sorted = [...data].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];

      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    this.donations.set(sorted);
  }

  alert(message: string): void {
  window.alert(message);
}

  deleteDonation(id: string): void {
    console.log('Deleting donation with ID:', id);
    this.dashboardService.deleteDonationWithFeedback(
      id,
      this.dialog,
      this.router,
      () => {
        // Callback: Refresh the list
        // this.dashboardService.loadDonations();
        console.log('Donation deleted, list should refresh now.');
        this.fetchDonations(this.selectedStatus());
      }
    );
  }
}
