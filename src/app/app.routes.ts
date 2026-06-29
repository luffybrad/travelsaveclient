// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { PublicGuard } from './guards/public.guard';
import { LoginComponent } from './admin/auth/login/login';
import { RegisterComponent } from './admin/auth/register/register';
import { ForgotPasswordComponent } from './admin/auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './admin/auth/reset-password/reset-password';
import { EmailConfirmationComponent } from './admin/auth/email-confirmation/email-confirmation';
import { AdminLayoutComponent } from './admin/components/layout/layout';
import { AdminDashboardComponent } from './admin/components/dashboard/dashboard';
import { UsersComponent } from './admin/components/users/users';
import { AdminPlansComponent } from './admin/components/plans/plans';
import { AdminLedgerComponent } from './admin/components/ledger/ledger';

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
        component: LoginComponent,
        canActivate: [PublicGuard],
      },
      {
        path: 'register',
        component: RegisterComponent,
        canActivate: [PublicGuard],
      },
      {
        path: 'forgot-password',
        component: ForgotPasswordComponent,
        canActivate: [PublicGuard],
      },
      {
        path: 'reset-password',
        component: ResetPasswordComponent,
        canActivate: [PublicGuard],
      },
      {
        path: 'email-confirmation',
        component: EmailConfirmationComponent,
        canActivate: [PublicGuard],
      },
      // ✅ Admin Routes with Layout
      {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [AdminAuthGuard],
        children: [
          {
            path: 'dashboard',
            component: AdminDashboardComponent,
          },
          {
            path: 'users',
            component: UsersComponent,
          },
          {
            path: 'plans',
            component: AdminPlansComponent,
          },
          {
            path: 'ledger',
            component: AdminLedgerComponent,
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
