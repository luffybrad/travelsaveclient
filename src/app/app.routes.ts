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
    ],
  },
  {
    path: '**',
    redirectTo: '/admin/login',
  },
];
