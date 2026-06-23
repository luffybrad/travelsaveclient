// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { PublicGuard } from './guards/public.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/admin/login',
    pathMatch: 'full',
  },
  {
    path: 'admin',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./admin/auth/login/login').then((m) => m.LoginComponent),
        canActivate: [PublicGuard],
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./admin/auth/register/register').then((m) => m.RegisterComponent),
        canActivate: [PublicGuard],
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./admin/auth/forgot-password/forgot-password').then(
            (m) => m.ForgotPasswordComponent,
          ),
        canActivate: [PublicGuard],
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./admin/auth/reset-password/reset-password').then(
            (m) => m.ResetPasswordComponent,
          ),
        canActivate: [PublicGuard],
      },
      {
        path: 'email-confirmation',
        loadComponent: () =>
          import('./admin/auth/email-confirmation/email-confirmation').then(
            (m) => m.EmailConfirmationComponent,
          ),
      },
      // ✅ Admin Routes with Layout
      {
        path: '',
        loadComponent: () =>
          import('./admin/components/layout/layout').then((m) => m.AdminLayoutComponent),
        canActivate: [AdminAuthGuard],
        children: [
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./admin/components/dashboard/dashboard').then(
                (m) => m.AdminDashboardComponent,
              ),
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./admin/components/users/users').then((m) => m.UsersComponent),
          },
          {
            path: 'plans',
            loadComponent: () =>
              import('./admin/components/plans/plans').then((m) => m.AdminPlansComponent),
          },
          {
            path: 'ledger',
            loadComponent: () =>
              import('./admin/components/ledger/ledger').then((m) => m.AdminLedgerComponent),
          },
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full',
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/admin/login',
  },
];
