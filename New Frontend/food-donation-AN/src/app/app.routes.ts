// src/app/app.routes.ts
import { Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DonationDetailComponent } from './dashboard/donation-details/donation-details.component';
import { DonationListComponent } from './dashboard/donation-list/donation-list.component';
import { SigninComponent } from './auth/signin/signin.component';
import { SignupComponent } from './auth/signup/signup.component';
import { authGuard } from './auth/auth.guard';
import { roleGuard } from './auth/role.guard'; // ✅ Import new roleGuard
import { CreateDonationComponent } from './dashboard/create-donation/create-donation.component';
import { UpdateDonationComponent } from './dashboard/update-donation/update-donation.component';
import { ProfileComponent } from './profile/profile.component';
import { OAuth2RedirectComponent } from './auth/oauth2-redirect/oauth2-redirect.component';
import { Oauth2CompleteProfileComponent } from './auth/oauth2-complete-profile/oauth2-complete-profile.component';
import { OAuthGuard } from './auth/oauth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: DonationListComponent },
      {
        path: 'create',
        component: CreateDonationComponent,
        canActivate: [authGuard, roleGuard], // ✅ Add roleGuard
        data: { allowedRoles: ['ROLE_DONOR'] }, // ✅ Specify allowed roles
      },
      {
        path: 'donations/:donationId',
        children: [
          { path: '', component: DonationDetailComponent },
          {
            path: 'update',
            component: UpdateDonationComponent,
            canActivate: [authGuard, roleGuard], // ✅ Add roleGuard
            data: { allowedRoles: ['ROLE_DONOR'] }, // ✅ Specify allowed roles
          },
        ],
      },
    ],
  },
  {
    path: 'auth',
    children: [
      {
        path: '',
        redirectTo: 'signin',
        pathMatch: 'full',
      },
      {
        path: 'signin',
        component: SigninComponent,
      },
      {
        path: 'signup',
        component: SignupComponent,
      },
      { path: 'oauth2/redirect', component: OAuth2RedirectComponent },
      {
        path: 'complete-profile',
        component: Oauth2CompleteProfileComponent,
        canActivate: [OAuthGuard],
      },
    ],
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard],
  },
];