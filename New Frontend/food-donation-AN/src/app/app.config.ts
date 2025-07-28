import {
  APP_INITIALIZER,
  ApplicationConfig,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { authInterceptorFn } from './auth/auth.interceptor';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Verdant } from '../theme/verdant.theme';
import {
  LucideAngularModule,
  Leaf,
  HandHeart,
  ArrowRight,
  Users,
  CheckCircle,
  Building2,
  Clock,
  MapPin,
  Heart,
  Plus,
  Key,
  Edit,
  Upload,
  X,
  Check,
  Mail,
  Loader,
  Handshake,
  RefreshCw,
  Image,
  Package,
  Info,
  CalendarPlus,
  CalendarCheck,
  AlertTriangle,
  Trash2,
  ArrowLeft,
  Save,
  MapIcon,
  AlertCircle,
  HeartHandshake,
  HomeIcon,
  History,
  PlusCircle,
  User,
  LogOut
} from 'lucide-angular';
import { provideNgxWebstorage, withLocalStorage, withNgxWebstorageConfig, withSessionStorage } from 'ngx-webstorage';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptorFn])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Verdant,
        options: {
          prefix: 'p',
          darkModeSelector: '.dark',
        },
      },
    }),
    importProvidersFrom(
      LucideAngularModule.pick({
        Leaf,
        HandHeart,
        ArrowRight,
        ArrowLeft,
        Users,
        CheckCircle,
        Building2,
        Clock,
        MapPin,
        Heart,
        Plus,
        Key,
        Edit,
        Upload,
        X,
        Check,
        Mail,
        Loader,
        Handshake,
        RefreshCw,
        Image,
        Package,
        Info,
        CalendarPlus,
        CalendarCheck,
        AlertTriangle,
        Trash2,
        Save,
        MapIcon,
        AlertCircle,
        HeartHandshake,
        HomeIcon,
        History,
        PlusCircle,
        User,
        LogOut
      })
    ),
    MessageService,
    ConfirmationService,
    provideNgxWebstorage(
			withNgxWebstorageConfig({ separator: ':', caseSensitive: true }),
			withLocalStorage(),
			withSessionStorage()
		)
  ],
};
