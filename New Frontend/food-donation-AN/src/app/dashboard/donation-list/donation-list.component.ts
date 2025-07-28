import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { WritableSignal } from '@angular/core';

import { DashboardService } from '../../services/dashboard.service';
import { donation } from '../donation.model'; // Correct path to donation interface
import { HasRoleDirective } from '../../directives/has-role.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TokenService } from '../../services/token.service';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog'; // Keep if MatDialog is still used
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { LucideAngularModule } from 'lucide-angular';
import { FirstTimeDonationPopupComponent } from '../../first-time-donation-popup/first-time-donation-popup.component';
import { HeaderComponent } from '../../header/header.component';
// import { Dialog } from 'primeng/dialog'; // Dialog from primeng/dialog, not from 'primeng/api'

// Define a type for your processed donation, including the new clientSideId
type ProcessedDonation = donation & { clientSideId?: number };

@Component({
  selector: 'app-donation-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    HasRoleDirective,
    SidebarComponent,
    CommonModule, // Added CommonModule for @if, @for
    HeaderComponent,
    FirstTimeDonationPopupComponent,
    ConfirmDialogModule,
    ToastModule,
    ButtonModule,
    LucideAngularModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './donation-list.component.html',
  styleUrl: './donation-list.component.css',
})
export class DonationListComponent implements OnInit {
  // ✅ Changed donations signal to hold ProcessedDonation array
  donations = signal<ProcessedDonation[] | undefined>(undefined);
  public tokenService = inject(TokenService);
  isFetching = signal(false);
  error = signal('');
  isFirstDonation = signal(false);
  donationsThisMonth = signal(0);
  selectedStatus = signal<'AVAILABLE' | 'CLAIMED' | 'COLLECTED'>('AVAILABLE');
  role = this.tokenService.getUserRole();

  sortField: keyof donation = 'createdAt'; // Default sort field for list
  sortOrder: 'asc' | 'desc' = 'desc'; // Default sort order
  sortDirections = new Map<keyof donation, 'asc' | 'desc'>();

  private route = inject(ActivatedRoute);

  private dashboardService = inject(DashboardService);
  private destroyRef = inject(DestroyRef);

  constructor(
    private dialog: MatDialog, // Keep if MatDialog is still used, otherwise remove
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Initialize sort directions for all sortable fields
    const sortableFields: (keyof donation)[] = [
      'donationId',
      'itemName',
      'quantity',
      'createdAt',
    ];

    for (const field of sortableFields) {
      this.sortDirections.set(field, 'asc'); // Default to 'asc' for initial click
    }

    // Set default sort field and order based on your preference
    this.sortField = 'createdAt';
    this.sortOrder = 'desc'; // Start with newest first for 'createdAt'

    // Subscribe to query params to react to status changes in URL
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef)) // Auto-unsubscribe
      .subscribe((params) => {
        const rawStatus = params['status']?.toUpperCase();
        const validStatuses: ('AVAILABLE' | 'CLAIMED' | 'COLLECTED')[] = [
          'AVAILABLE',
          'CLAIMED',
          'COLLECTED',
        ];
        const status = validStatuses.includes(rawStatus)
          ? rawStatus
          : 'AVAILABLE'; // Default to 'AVAILABLE' if invalid
        this.selectedStatus.set(status);
        this.fetchDonations(status); // Fetch with current status
      });
  }

  selectStatus(status: 'AVAILABLE' | 'CLAIMED' | 'COLLECTED'): void {
    // Update query params, which will trigger ngOnInit's queryParams subscription
    // and then fetchDonations. This ensures URL sync.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: status.toLowerCase() }, // Keep URL consistent
      queryParamsHandling: 'merge', // Merge with existing query params
    });
  }

  private fetchDonations(status: 'AVAILABLE' | 'CLAIMED' | 'COLLECTED'): void {
    console.log(
      'DonationListComponent: Triggering donation fetch for status:',
      status
    );
    this.isFetching.set(true);
    this.dashboardService
      .loadDonations(status) // This is now SSR-safe
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (donationsData: donation[] | undefined) => {
          let processedDonations: ProcessedDonation[] = [];
          if (donationsData) {
            // ✅ FIX: Process donations to add clientSideId for DONOR role
            if (this.role === 'ROLE_DONOR') {
              // Sort data by 'createdAt' (newest first for default, or as per sortOrder)
              const sortedByCreatedAt = [...donationsData].sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                // Ensure sorting matches sortOrder for createdAt
                return this.sortDirections.get('createdAt') === 'desc'
                  ? dateB - dateA
                  : dateA - dateB;
              });

              // Assign sequential clientSideId
              processedDonations = sortedByCreatedAt.map((d, index) => ({
                ...d,
                clientSideId: index + 1, // 1-based ID
              }));
            } else {
              // For other roles, just cast without adding clientSideId if not needed
              processedDonations = donationsData as ProcessedDonation[];
            }
          }

          this.donations.set(processedDonations); // Update the signal
          this.error.set(''); // Clear previous errors

          // Only show first donation popup for Donor and if no donations are present
          if (this.role === 'ROLE_DONOR' && (!donationsData || donationsData.length === 0)) {
            const hasMadeFirstDonation = localStorage.getItem(
              'donorFirstTimePopupShown'
            );
            if (!hasMadeFirstDonation) {
              this.isFirstDonation.set(true);
            }
          }
        },
        error: (error: Error) => {
          this.error.set(error.message);
          this.messageService.add({
            severity: 'error',
            summary: 'Data Load Error',
            detail: error.message,
          });
          console.error('Failed to load donations:', error);
        },
        complete: () => {
          this.isFetching.set(false);
          this.sortDonations(); // Apply sorting after fetching, for all roles
        },
      });
  }

  // For toggling sorting on header click
  toggleSort(field: keyof donation): void {
    // Only sort if data is present
    if (!this.donations()) return;

    // Toggle direction only for this field
    const currentDir = this.sortDirections.get(field) || 'asc';
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';
    console.log(`Toggling sort for ${field}: ${currentDir} -> ${newDir}`);
    this.sortDirections.set(field, newDir);

    this.sortField = field;
    this.sortOrder = newDir; // Update sortOrder to match direction for backend/general use
    this.sortDonations(); // Apply sorting to the current data
  }

  // Sort function that updates the signal correctly
  // This function now sorts the 'donations' signal which may contain clientSideId
  sortDonations(): void {
    const field = this.sortField;
    const direction = this.sortDirections.get(field) || 'asc';
    const data = this.donations();

    if (!data || data.length === 0) return;

    const sorted = [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Special handling for createdAt if it's a date string
      if (field === 'createdAt') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      } else if (field === 'donationId') {
        // Handle donationId sorting on the actual backend ID, even if clientSideId is displayed
        aValue = a.donationId;
        bValue = b.donationId;
      }
      else {
        aValue = a[field];
        bValue = b[field];
      }

      if (aValue === undefined || aValue === null) return direction === 'asc' ? 1 : -1; // Move undefined/null to end
      if (bValue === undefined || bValue === null) return direction === 'asc' ? -1 : 1; // Move undefined/null to end


      // Standard comparison for strings and numbers
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      // For numbers
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    this.donations.set(sorted);
  }

  deleteDonation(id: string): void {
    console.log('Deleting donation with ID:', id);
    // Assuming deleteDonationWithFeedback is correctly defined in DashboardService
    // and handles its own confirmation/toasts
    this.dashboardService.deleteDonationWithFeedback(
      id,
      this.dialog, // If MatDialog is used within deleteDonationWithFeedback
      this.router,
      () => {
        // Callback after successful deletion: refresh the list
        console.log('Donation deleted, list should refresh now.');
        this.fetchDonations(this.selectedStatus());
      }
    );
  }

  confirmDelete(event: Event, id: string) {
    this.confirmationService.confirm({
      key: 'global',
      target: event.target as EventTarget,
      message: `Do you want to delete this record?`,
      header: 'Danger Zone',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Delete',
        severity: 'danger',
      },
      accept: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Record deleted',
        });
        this.deleteDonation(id);
      },
      reject: () => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Cancelled',
          detail: 'Deletion aborted',
        });
      },
    });
  }
}