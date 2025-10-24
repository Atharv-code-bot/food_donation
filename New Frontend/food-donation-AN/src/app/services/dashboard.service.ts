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

import { TokenService } from './token.service';
import { donation } from '../dashboard/donation.model';
import { SuccessDialogComponent } from '../shared/success-dialog/success-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { isPlatformBrowser } from '@angular/common';

export interface ImageLoadState {
  state: 'loading' | 'loaded' | 'error';
  url?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiUrl = 'http://localhost:8080';
  private httpClient = inject(HttpClient);
  private tokenService = inject(TokenService);
  private messageService = inject(MessageService);
  private baseUrl = 'http://localhost:8080';
  private imageCache = new Map<string, BehaviorSubject<ImageLoadState>>();
  private activeMap: L.Map | null = null; // To store the map instance
  private activeMarker: L.Marker | null = null; // To store the active marker instance
  private _selectedCoordinates = new Subject<{ lat: number; lng: number }>();
  selectedCoordinates$ = this._selectedCoordinates.asObservable();
  private platformId = inject(PLATFORM_ID); // ✅ Inject PLATFORM_ID
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

  sendOtp(id: string) {
    return this.httpClient.post(
      `http://localhost:8080/donations/${id}/send-otp`,
      {},
      { responseType: 'text' } // explicitly tell Angular it's plain text
    );
  }

  completeDonation(id: string, otp: string) {
    return this.httpClient.put(
      `http://localhost:8080/donations/${id}/complete`,
      null,
      {
        params: { otp },
      }
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
        url = `${this.apiUrl}/donations/status/AVAILABLE`;
      } else {
        url = `${this.apiUrl}/donations/ngo/${status}`;
      }
    } else if (role === 'ROLE_DONOR') {
      url = `${this.apiUrl}/donations/user/${status}`;
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

  /**
   * Loads an image from the server and caches it.
   * @param photoUrl The URL of the image to load.
   * @returns An observable that emits the image load state.
   */
  loadImage(photoUrl: string): Observable<ImageLoadState> {
    if (this.imageCache.has(photoUrl)) {
      return this.imageCache.get(photoUrl)!.asObservable();
    }

    const subject = new BehaviorSubject<ImageLoadState>({ state: 'loading' });
    this.imageCache.set(photoUrl, subject);

    if (photoUrl.includes('/null')) {
      subject.next({
        state: 'error',
        error: 'Image not available (URL is null)',
      });
      return subject.asObservable();
    }

    this.httpClient
      .get(`${this.baseUrl}${photoUrl}`, {
        responseType: 'blob',
      })
      .pipe(
        map((blob) => {
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
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const L = await import('leaflet');

    if (
      latitude == null || longitude == null || isNaN(lat) || isNaN(lng) || !mapContainerId
    ) {
      return '❗ Coordinates are missing or invalid for this donation, or map container ID is not provided.';
    }

    try {
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
        const popupContent = address || `Lat: ${markerLat.toFixed(6)}, Lng: ${markerLng.toFixed(6)}`;
        this._markerInstance = L.marker([markerLat, markerLng]).addTo(this._mapInstance!);
        this._markerInstance.bindPopup(popupContent).openPopup();
        console.log(`📍 Marker set at: ${markerLat.toFixed(6)}, ${markerLng.toFixed(6)}`);
      };
      await updateMarker(lat, lng);
      if (isEditable) {
        this._mapInstance.on('click', async (e: any) => {
          const { lat, lng } = e.latlng;
          await updateMarker(lat, lng);
          this._selectedCoordinates.next({ lat, lng });
        });
      } else {
        this._mapInstance.doubleClickZoom.disable();
        this._mapInstance.scrollWheelZoom.disable();
        this._mapInstance.boxZoom.disable();
        this._mapInstance.keyboard.disable();
        if ((this._mapInstance as any).tap) (this._mapInstance as any).tap.disable();
      }
      return null;
    } catch (err) {
      console.error('🛑 Map initialization failed in service:', err);
      return '❗ Unable to load map. Coordinates may be missing or map service failed.';
    }
  }

  async initializeLocationSelectionMap(
    mapContainerId: string,
    initialLat: number | null,
    initialLng: number | null,
    defaultLat: number | null,
    defaultLng: number | null
  ): Promise<string | null> {
    if (!mapContainerId) {
      return 'Map container ID is not provided.';
    }
    const L = await import('leaflet');

    try {
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
      const setAndEmitMarker = async (
        markerLat: number,
        markerLng: number,
        popupMsg: string
      ) => {
        if (this._markerInstance) {
          map.removeLayer(this._markerInstance);
        }
        const address = await this.reverseGeocode(markerLat, markerLng);
        const popupContent = address || popupMsg;
        this._markerInstance = L.marker([markerLat, markerLng]).addTo(map);
        this._markerInstance.bindPopup(popupContent).openPopup();
        this._selectedCoordinates.next({ lat: markerLat, lng: markerLng });
        console.log(`📍 Marker set at: ${markerLat.toFixed(6)}, ${markerLng.toFixed(6)}`);
      };

      if (initialLat !== null && initialLng !== null && !isNaN(initialLat) && !isNaN(initialLng)) {
        map.setView([initialLat, initialLng], 15);
        await setAndEmitMarker(initialLat, initialLng, 'Initial Location');
      } else if (navigator.geolocation) {
        const tryGeolocation = (options: PositionOptions, isRetry: boolean) => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              console.log(`✅ Geolocation successful: ${lat}, ${lng}`);
              map.setView([lat, lng], 15);
              await setAndEmitMarker(lat, lng, 'You are here');
            },
            (error) => {
              console.warn(`⚠️ Geolocation error (Code: ${error.code}):`, error.message);
              let errorMessage = `Geolocation failed: ${error.message}.`;
              switch (error.code) {
                case error.PERMISSION_DENIED: errorMessage = 'You denied location access. Please enable it in browser settings to use this feature.'; break;
                case error.POSITION_UNAVAILABLE: errorMessage = 'Location information is unavailable. Check your device settings and network connection.';
                  if (!isRetry && options.enableHighAccuracy) {
                    console.log('Retrying geolocation with lower accuracy...');
                    tryGeolocation({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }, true);
                    return;
                  }
                  break;
                case error.TIMEOUT: errorMessage = 'The request to get user location timed out.';
                  if (!isRetry && options.enableHighAccuracy) {
                    console.log('Retrying geolocation with lower accuracy...');
                    tryGeolocation({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }, true);
                    return;
                  }
                  break;
              }
              alert(errorMessage + ' Using default location.');
              setAndEmitMarker(defaultLat!, defaultLng!, 'Default Location: Pune');
            },
            options
          );
        };
        tryGeolocation({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }, false);
      } else {
        console.warn('⚠️ Geolocation not supported by this browser.');
        alert('Geolocation not supported by your browser. Using default location.');
        await setAndEmitMarker(defaultLat!, defaultLng!, 'Default Location: Pune');
      }
      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        await setAndEmitMarker(lat, lng, 'Selected Location');
      });
      return null;
    } catch (err) {
      console.error('🛑 Map initialization failed in service:', err);
      return '❗ Unable to load map. Map service failed.';
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) {
        return null;
    }
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await firstValueFrom(this.httpClient.get<any>(nominatimUrl));
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
