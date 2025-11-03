import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
  map,
  Observable,
  BehaviorSubject,
  catchError,
  of,
  Subject,
  firstValueFrom,
  throwError,
} from 'rxjs';
import { shareReplay, startWith } from 'rxjs/operators';

import { TokenService } from './token.service';
import { donation } from '../dashboard/donation.model';
import { SuccessDialogComponent } from '../shared/success-dialog/success-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment'; // This automatically selects the correct file

// export interface ImageLoadState {
//   state: 'loading' | 'loaded' | 'error';
//   url?: string;
//   error?: string;
// }

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private API_URL = environment.apiUrl;
  private httpClient = inject(HttpClient);
  private tokenService = inject(TokenService);
  private messageService = inject(MessageService);
  // The cache now stores the Observable itself, not a BehaviorSubject
  // private imageCache = new Map<string, Observable<ImageLoadState>>();
  private activeMap: L.Map | null = null; // To store the map instance
  private activeMarker: L.Marker | null = null; // To store the active marker instance
  private _selectedCoordinates = new Subject<{ lat: number; lng: number }>();
  selectedCoordinates$ = this._selectedCoordinates.asObservable();
  private platformId = inject(PLATFORM_ID); // ✅ Inject PLATFORM_ID
  //   constructor() {
  //     const token = localStorage.getItem('token')
  //   }
  createDonation(formData: FormData) {
    return this.httpClient.post(`${this.API_URL}/donations`, formData);
  }

  updateDonation(id: string, formData: FormData) {
    return this.httpClient.put(`${this.API_URL}/donations/${id}`, formData);
  }
  deleteDonation(id: string) {
    return this.httpClient.delete(`${this.API_URL}/${id}`, {
      responseType: 'text', // 👈 Tell Angular to expect plain text, not JSON
    });
  }

  claimDonation(id: string) {
    return this.httpClient.put(`${this.API_URL}/donations/${id}/claim`, {});
  }

  sendOtp(id: string) {
    return this.httpClient.post(
      `${this.API_URL}/donations/${id}/send-otp`,
      {},
      { responseType: 'text' } // explicitly tell Angular it's plain text
    );
  }

  completeDonation(id: string, otp: string) {
    return this.httpClient.put(
      `${this.API_URL}/donations/${id}/complete`,
      null,
      {
        params: { otp },
      }
    );
  }

  getDonation(id: string) {
    return this.httpClient.get<donation>(`${this.API_URL}/donations/${id}`);
  }

  loadDonation(id: string) {
    return this.fetchDonation(`${this.API_URL}/donations/${id}`);
  }

  loadDonations(
    status: 'AVAILABLE' | 'CLAIMED' | 'COLLECTED'
  ): Observable<donation[]> {
    // ✅ FIX: Only proceed with data fetching if in a browser environment
    if (!isPlatformBrowser(this.platformId)) {
      console.log(
        'DashboardService: Running on server. Skipping donation data fetch.'
      );
      // Return an empty observable on the server to prevent errors.
      // The client-side ngOnInit will re-trigger this correctly.
      return of([]);
    }

    const role = this.tokenService.getUserRole(); // This call is now safe (only in browser)
    let url = '';
    console.log(
      'DashboardService: Fetching donations client-side. User role:',
      role
    );

    if (role === 'ROLE_NGO') {
      if (status === 'AVAILABLE') {
        url = `${this.API_URL}/donations/status/AVAILABLE`;
      } else {
        url = `${this.API_URL}/donations/ngo/${status}`;
      }
    } else if (role === 'ROLE_DONOR') {
      url = `${this.API_URL}/donations/user/${status}`;
    } else {
      // This error will only be thrown client-side if a valid role isn't found
      // after the token is read.
      console.error(
        'DashboardService: Unsupported user role for data fetching:',
        role
      );
      return throwError(
        () => new Error('Unsupported user role for data fetching.')
      );
    }

    // Now call your fetchDonations private method
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

  // /**
  //  * Loads an image from a direct URL and provides its load state.
  //  * @param photoUrl The direct, full URL of the image to load.
  //  * @returns An observable that emits the image load state.
  //  */
  // loadImage(photoUrl: string): Observable<ImageLoadState> {
  //   // 1. Check if we've already tried to load this image
  //   if (this.imageCache.has(photoUrl)) {
  //     return this.imageCache.get(photoUrl)!;
  //   }

  //   // 2. Handle null/invalid URLs
  //   if (!photoUrl || photoUrl.includes('/null')) {
  //     const errorState = of({
  //       state: 'error' as const,
  //       error: 'Image not available (URL is null)',
  //     });
  //     // Cache the error response
  //     this.imageCache.set(photoUrl, errorState);
  //     return errorState;
  //   }

  //   // 3. Create a new Observable to manage the image loading
  //   const loadObservable = new Observable<ImageLoadState>((observer) => {
  //     const img = new Image();

  //     // On successful load
  //     img.onload = () => {
  //       observer.next({ state: 'loaded', url: photoUrl });
  //       observer.complete();
  //     };

  //     // On load error
  //     img.onerror = (err) => {
  //       console.error('Failed to load image from URL:', photoUrl, err);
  //       observer.next({ state: 'error', error: 'Failed to load image' });
  //       observer.complete();
  //     };

  //     // Start the download by setting the src
  //     img.src = photoUrl;
  //   }).pipe(
  //     startWith({ state: 'loading' as const }), // Immediately emit 'loading'
  //     shareReplay(1) // Cache the final result (loaded or error)
  //   );

  //   // 4. Store this new observable in the cache and return it
  //   this.imageCache.set(photoUrl, loadObservable);
  //   return loadObservable;
  // }

  // // Add this function to your ImageService
  // clearFromCache(photoUrl: string): void {
  //   this.imageCache.delete(photoUrl);
  // }

  // /**
  //  * Loads an image from the server and returns it as a Blob.
  //  * @param photoUrl The URL of the image to load.
  //  * @returns An observable that emits the Blob of the image.
  //  */
  // // Clean up specific image from cache
  // clearImageFromCache(photoUrl: string): void {
  //   const subject = this.imageCache.get(photoUrl);
  //   if (subject) {
  //     const currentValue = subject.value;
  //     if (currentValue.url) {
  //       URL.revokeObjectURL(currentValue.url);
  //     }
  //     subject.complete();
  //     this.imageCache.delete(photoUrl);
  //   }
  // }

  // // Clean up all cached images
  // clearAllImages(): void {
  //   this.imageCache.forEach((subject, key) => {
  //     const currentValue = subject.value;
  //     if (currentValue.url) {
  //       URL.revokeObjectURL(currentValue.url);
  //     }
  //     subject.complete();
  //   });
  //   this.imageCache.clear();
  // }

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
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: 'Record Updated',
        });
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
        this.messageService.add({
          severity: 'warn',
          summary: 'Cancelled',
          detail: 'Update aborted',
        });
        dialog.open(SuccessDialogComponent, {
          data: { message: 'Failed to update donation.' },
        });
      },
    });
  }

  /**
   * Initializes a Leaflet map.
   * - Can be view-only (for details) or editable (for updates).
   * - Shows address in marker popup.
   * @param mapContainerId The ID of the HTML element where the map will be rendered.
   * @param latitude The latitude of the donation.
   * @param longitude The longitude of the donation.
   * @param isEditable If true, allows click-to-place marker and emits new coordinates.
   * @returns A Promise that resolves with null on success, or an error message string on failure.
   */
  // ✅ FIX: Use a shared private property for the active map instance
  // The map instance should not be passed around. It lives in the service.
  private _mapInstance: L.Map | null = null;
  private _markerInstance: L.Marker | null = null;
  private _isMapReady = new Subject<void>();

  // This method is now used by `MapComponent` to initialize a view-only map
  async initializeDonationMap(
  mapContainerId: string,
  latitude: string,
  longitude: string,
  isEditable: boolean = false
): Promise<string | null> {
  if (typeof window === 'undefined') {
    console.warn('Leaflet map not initialized — running on server.');
    return null;
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (!mapContainerId || isNaN(lat) || isNaN(lng)) {
    return '❗ Coordinates are missing or invalid.';
  }

  try {
    // Lazy import only in browser
    const L = await import('leaflet');

    if (this._mapInstance) {
      this._mapInstance.remove();
      this._mapInstance = null;
    }

    this._mapInstance = L.map(mapContainerId, {
      zoomControl: true,
      dragging: !isEditable,
      scrollWheelZoom: !isEditable,
    }).setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this._mapInstance);

    const updateMarker = async (markerLat: number, markerLng: number) => {
      if (this._markerInstance) {
        this._mapInstance?.removeLayer(this._markerInstance);
      }
      const address = await this.reverseGeocode(markerLat, markerLng);
      const popupContent = address || `Lat: ${markerLat}, Lng: ${markerLng}`;
      this._markerInstance = L.marker([markerLat, markerLng]).addTo(this._mapInstance!);
      this._markerInstance.bindPopup(popupContent).openPopup();
    };

    await updateMarker(lat, lng);

    if (isEditable) {
      this._mapInstance.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        await updateMarker(lat, lng);
        this._selectedCoordinates.next({ lat, lng });
      });
    }

    return null;
  } catch (err) {
    console.error('🛑 Map initialization failed in service:', err);
    return '❗ Unable to load map.';
  }
}


  async initializeLocationSelectionMap(
  mapContainerId: string,
  initialLat: number | null,
  initialLng: number | null,
  defaultLat: number | null,
  defaultLng: number | null
): Promise<string | null> {
  if (typeof window === 'undefined') {
    console.warn('Leaflet map not initialized — running on server.');
    return null;
  }

  if (!mapContainerId) return 'Map container ID is not provided.';

  try {
    const L = await import('leaflet');

    if (this._mapInstance) {
      this._mapInstance.remove();
      this._mapInstance = null;
    }

    const map = L.map(mapContainerId, {
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    this._mapInstance = map;

    const setAndEmitMarker = async (lat: number, lng: number, popupMsg: string) => {
      if (this._markerInstance) map.removeLayer(this._markerInstance);
      const address = await this.reverseGeocode(lat, lng);
      const popupContent = address || popupMsg;
      this._markerInstance = L.marker([lat, lng]).addTo(map);
      this._markerInstance.bindPopup(popupContent).openPopup();
      this._selectedCoordinates.next({ lat, lng });
    };

    if (initialLat && initialLng) {
      map.setView([initialLat, initialLng], 15);
      await setAndEmitMarker(initialLat, initialLng, 'Initial Location');
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          map.setView([lat, lng], 15);
          await setAndEmitMarker(lat, lng, 'You are here');
        },
        async () => {
          await setAndEmitMarker(defaultLat!, defaultLng!, 'Default Location');
        }
      );
    } else {
      await setAndEmitMarker(defaultLat!, defaultLng!, 'Default Location');
    }

    map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng;
      await setAndEmitMarker(lat, lng, 'Selected Location');
    });

    return null;
  } catch (err) {
    console.error('🛑 Map initialization failed in service:', err);
    return '❗ Unable to load map.';
  }
}


  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await firstValueFrom(
        this.httpClient.get<any>(nominatimUrl)
      );
      if (response && response.display_name) {
        return response.display_name;
      } else if (response && response.address) {
        const address = response.address;
        let formattedAddress = '';
        if (address.road) formattedAddress += address.road + ', ';
        if (address.suburb) formattedAddress += address.suburb + ', ';
        if (address.city) formattedAddress += address.city + ', ';
        else if (address.town) formattedAddress += address.town + ', ';
        else if (address.village) formattedAddress += address.village + ', ';
        if (address.state) formattedAddress += address.state + ', ';
        if (address.postcode) formattedAddress += address.postcode;
        return formattedAddress.replace(/, $/, '');
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  destroyMap(): void {
    if (this.activeMap) {
      this.activeMap.remove();
      this.activeMap = null;
      this.activeMarker = null;
      console.log('Map instance destroyed.');
    }
  }
}
