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
        loadComponent: () => import('./admin/login/login').then((m) => m.LoginComponent),
        canActivate: [PublicGuard],
      },
      {
        path: 'register',
        loadComponent: () => import('./admin/register/register').then((m) => m.RegisterComponent),
        canActivate: [PublicGuard],
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./admin/forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
        canActivate: [PublicGuard],
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./admin/reset-password/reset-password').then((m) => m.ResetPasswordComponent),
        canActivate: [PublicGuard],
      },
    ],
  },
];
