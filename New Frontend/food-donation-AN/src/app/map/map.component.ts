// src/app/map/map.component.ts
import {
  Component,
  OnInit,
  AfterViewInit,
  inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  signal,
  DestroyRef,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DashboardService } from '../services/dashboard.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { donation } from '../dashboard/donation.model';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonModule } from 'primeng/button';
import { After } from 'v8';
import { TokenService } from '../services/token.service';

interface Coords {
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements OnDestroy, OnChanges {
  // Change lifecycle hooks
  @Input() mode: 'create' | 'update' | 'view' | 'set-default-location' =
    'create';
  @Input() donationData?: donation;
  @Input() mapId: string = 'map'; // ✅ New input for unique ID
  @Input() initialLat?: number | null; // Pass initial coords from parent
  @Input() initialLng?: number | null; // Pass initial coords from parent
  @Output() coordsChange = new EventEmitter<Coords>();
  @Output() initialCoordsSet = new EventEmitter<Coords>();

  mapError = signal<string | null>(null);
  mapLoading = signal(false);

  private mapInitialized = false; // ✅ FIX: New flag to prevent re-initialization
  private dashboardService = inject(DashboardService);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  private isBrowser?: boolean;

  // Default coordinates (Pune, India)
  private defaultLat!: number | null;
  private defaultLng!: number | null;

  constructor(private tokenService: TokenService) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Access localStorage safely here
    const { latitude, longitude } = this.tokenService.getCoordinates();
    this.defaultLat = latitude ? parseFloat(latitude) : null;
    this.defaultLng = longitude ? parseFloat(longitude) : null;
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      this.dashboardService.destroyMap();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only re-initialize if donationData changes and the map has already been initialized.
    if (this.isBrowser && this.mapInitialized && changes['donationData']) {
      this.initializeMap();
    }
  }

  ngOnInit(): void {
    if (
      this.mode === 'create' ||
      this.mode === 'update' ||
      this.mode === 'set-default-location'
    ) {
      // ✅ FIX: Include new mode
      this.dashboardService.selectedCoordinates$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((coords) => {
          this.coordsChange.emit({ lat: coords.lat, lng: coords.lng });
        });
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser || this.mapInitialized) {
      return;
    }

    this.initializeMap();
    this.mapInitialized = true;
  }

  private async initializeMap(): Promise<void> {
    if (!this.isBrowser) {
      this.mapError.set('Map can only be loaded in a browser environment.');
      return;
    }

    this.mapError.set(null);
    this.mapLoading.set(true);

    let error: string | null = null;
    let initialLat: number | null = null;
    let initialLng: number | null = null;

    if (this.mode === 'create') {
      error = await this.dashboardService.initializeLocationSelectionMap(
        this.mapId,
        null,
        null,
        this.defaultLat!,
        this.defaultLng!
      );
    } else if (this.mode === 'update' && this.donationData) {
      error = await this.dashboardService.initializeLocationSelectionMap(
        this.mapId,
        parseFloat(this.donationData.latitude),
        parseFloat(this.donationData.longitude),
        this.defaultLat!,
        this.defaultLng!
      );
    } else if (this.mode === 'view' && this.donationData) {
      error = await this.dashboardService.initializeDonationMap(
        this.mapId,
        this.donationData.latitude,
        this.donationData.longitude,
        false
      );
    } else if (this.mode === 'set-default-location') {
      // ✅ FIX: Handle new mode
      error = await this.dashboardService.initializeLocationSelectionMap(
        this.mapId,
        this.defaultLat, // Use default location as initial
        this.defaultLng, // Use default location as initial
        this.defaultLat!,
        this.defaultLng!
      );
    }

    if (error) {
      this.mapError.set(error);
    }
    this.mapLoading.set(false);
  }

  useDefaultLocation(): void {
    if (this.defaultLat && this.defaultLng) {
      this.mapError.set(null);
      this.mapLoading.set(true);

      this.dashboardService
        .initializeLocationSelectionMap(
          this.mapId,
          this.defaultLat,
          this.defaultLng,
          null,
          null
        )
        .then((error) => {
          if (error) this.mapError.set(error);
          this.mapLoading.set(false);
        });
    } else {
      this.mapError.set(
        'No default location found. Please set one in your profile.'
      );
      this.mapLoading.set(false);
    }
  }

  retryInitializeMap(): void {
    this.initializeMap();
  }
}
