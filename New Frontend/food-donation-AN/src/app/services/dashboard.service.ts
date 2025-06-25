import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, BehaviorSubject, catchError, of } from 'rxjs';

import { TokenService } from './token.service';
import { donation } from '../dashboard/donation.model';
import { SuccessDialogComponent } from '../shared/success-dialog/success-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

export interface ImageLoadState {
  state: 'loading' | 'loaded' | 'error';
  url?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private httpClient = inject(HttpClient);
  private tokenService = inject(TokenService);
  private baseUrl = 'http://localhost:8080';
  private imageCache = new Map<string, BehaviorSubject<ImageLoadState>>();
  //   constructor() {
  //     const token = localStorage.getItem('token')
  //   }
  createDonation(formData: FormData) {
    return this.httpClient.post('http://localhost:8080/donations', formData);
  }

  updateDonation(id: string, formData: FormData) {
    return this.httpClient.put(
      `http://localhost:8080/donations/${id}`,
      formData
    );
  }
  deleteDonation(id: string) {
    return this.httpClient.delete(`http://localhost:8080/donations/${id}`, {
      responseType: 'text', // 👈 Tell Angular to expect plain text, not JSON
    });
  }

  claimDonation(id: string) {
    return this.httpClient.put(
      `http://localhost:8080/donations/${id}/claim`,
      {}
    );
  }

  completeDonation(id: string) {
    return this.httpClient.put(
      `http://localhost:8080/donations/${id}/complete`,
      {}
    );
  }

  getDonation(id: string) {
    return this.httpClient.get<donation>(
      `http://localhost:8080/donations/${id}`
    );
  }

  loadDonation(id: string) {
    return this.fetchDonation(`http://localhost:8080/donations/${id}`);
  }

  loadDonations(
    status: 'AVAILABLE' | 'CLAIMED' | 'COLLECTED'
  ): Observable<donation[]> {
    const role = this.tokenService.getUserRole();
    let url = '';
    console.log('User role:', role);

    if (role === 'ROLE_NGO') {
      if (status === 'AVAILABLE') {
        url = `http://localhost:8080/donations/status/AVAILABLE`;
      } else {
        url = `http://localhost:8080/donations/ngo/${status}`;
      }
    } else if (role === 'ROLE_DONOR') {
      url = `http://localhost:8080/donations/user/${status}`;
    } else {
      throw new Error('Unsupported user role');
    }

    return this.fetchDonations(url);
  }

  private fetchDonations(url: string) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.httpClient.get<donation[]>(url, { headers });
  }

  private fetchDonation(url: string) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.httpClient.get<donation>(url, { headers });
  }

  /**
   * Loads an image from the server and caches it.
   * @param photoUrl The URL of the image to load.
   * @returns An observable that emits the image load state.
   */
  loadImage(photoUrl: string): Observable<ImageLoadState> {
    // Return cached observable if already exists
    if (this.imageCache.has(photoUrl)) {
      return this.imageCache.get(photoUrl)!.asObservable();
    }

    // Create new subject for this image
    const subject = new BehaviorSubject<ImageLoadState>({ state: 'loading' });
    this.imageCache.set(photoUrl, subject);
    console.log(`Image cache miss for: ${photoUrl}`);
    // Start loading the image
    this.httpClient
      .get(`${this.baseUrl}${photoUrl}`, {
        responseType: 'blob',
      })
      .pipe(
        map((blob) => {
          console.log('Image blob received:', blob);
          const objectUrl = URL.createObjectURL(blob);
          return { state: 'loaded' as const, url: objectUrl };
        }),
        catchError((error) => {
          console.error('Failed to load donation image:', error);
          return of({ state: 'error' as const, error: 'Failed to load image' });
        })
      )
      .subscribe({
        next: (result) => subject.next(result),
        error: (error) =>
          subject.next({ state: 'error', error: error.message }),
      });
    console.log(`Fetching image from: ${this.baseUrl}${photoUrl}`);

    return subject.asObservable();
  }

  /**
   * Loads an image from the server and returns it as a Blob.
   * @param photoUrl The URL of the image to load.
   * @returns An observable that emits the Blob of the image.
   */
  // Clean up specific image from cache
  clearImageFromCache(photoUrl: string): void {
    const subject = this.imageCache.get(photoUrl);
    if (subject) {
      const currentValue = subject.value;
      if (currentValue.url) {
        URL.revokeObjectURL(currentValue.url);
      }
      subject.complete();
      this.imageCache.delete(photoUrl);
    }
  }

  // Clean up all cached images
  clearAllImages(): void {
    this.imageCache.forEach((subject, key) => {
      const currentValue = subject.value;
      if (currentValue.url) {
        URL.revokeObjectURL(currentValue.url);
      }
      subject.complete();
    });
    this.imageCache.clear();
  }

  /**
   * Deletes a donation and shows a success dialog.
   * @param id The ID of the donation to delete.
   * @param dialog The MatDialog instance to open the success dialog.
   * @param router The Router instance to navigate after deletion.
   * @param afterSuccess Optional callback to execute after successful deletion.
   */
  deleteDonationWithFeedback(
    id: string,
    dialog: MatDialog,
    router: Router,
    afterSuccess?: () => void
  ): void {
    this.deleteDonation(id).subscribe({
      next: () => {
        dialog
          .open(SuccessDialogComponent, {
            data: { message: 'Donation deleted successfully.' },
          })
          .afterClosed()
          .subscribe(() => {
            if (afterSuccess) afterSuccess(); // allows redirect or list refresh
            else router.navigate(['/dashboard']);
          });
      },
      error: (err) => {
        console.error('Error deleting donation:', err);
      },
    });
  }

  updateDonationWithFeedback(
    id: string,
    formData: FormData,
    dialog: MatDialog,
    router: Router,
    afterSuccess?: () => void
  ): void {
    this.updateDonation(id, formData).subscribe({
      next: () => {
        dialog
          .open(SuccessDialogComponent, {
            data: { message: 'Donation updated successfully.' },
          })
          .afterClosed()
          .subscribe(() => {
            if (afterSuccess) afterSuccess();
            else router.navigate(['/dashboard']);
          });
      },
      error: (err) => {
        console.error('❌ Error updating donation:', err);
        dialog.open(SuccessDialogComponent, {
          data: { message: 'Failed to update donation.' },
        });
      },
    });
  }
}
