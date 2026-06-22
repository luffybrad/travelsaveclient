// src/app/admin/auth/email-confirmation/email-confirmation.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-email-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './email-confirmation.html',
})
export class EmailConfirmationComponent implements OnInit {
  status: 'loading' | 'success' | 'error' = 'loading';
  isLoading = true;
  isResending = false;
  message = 'Verifying your email...';
  errorMessage: string | null = null;
  email: string | null = null;
  userId: string | null = null;
  token: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // ✅ Log the full URL for debugging
    console.log('🔍 Email Confirmation - Full URL:', window.location.href);
    console.log('🔍 Email Confirmation - Search params:', window.location.search);

    this.route.queryParams.subscribe((params) => {
      console.log('🔍 Email Confirmation - Query params:', params);

      const status = params['status'];
      const message = params['message'];
      const email = params['email'];
      const userId = params['userId'];
      const token = params['token'];

      // If coming from backend redirect with status
      if (status) {
        this.status = status === 'success' ? 'success' : 'error';
        this.isLoading = false;
        this.message = message
          ? decodeURIComponent(message)
          : status === 'success'
            ? 'Your email has been verified!'
            : 'Verification failed';
        this.email = email ? decodeURIComponent(email) : null;
        return;
      }

      // ✅ If coming directly with userId and token in URL - CALL THE API
      if (userId && token) {
        this.userId = userId;
        this.token = token;
        this.verifyEmailWithApi(userId, token);
      } else {
        this.status = 'error';
        this.isLoading = false;
        this.errorMessage = 'Invalid verification link. Missing required parameters.';
      }
    });
  }

  // ✅ NEW: Actually call the API to verify email
  private verifyEmailWithApi(userId: string, token: string): void {
    console.log('🔍 Calling verifyEmail API with userId:', userId, 'token:', token);

    this.authService
      .confirmEmail(userId, token)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Email verification response:', response);
          if (response.success) {
            this.status = 'success';
            this.message = response.message || 'Your email has been verified successfully!';
            this.email = response.data?.email || null;
          } else {
            this.status = 'error';
            this.errorMessage = response.message || 'Email verification failed.';
          }
        },
        error: (error) => {
          console.error('❌ Email verification error:', error);
          this.status = 'error';
          this.errorMessage =
            error?.error?.message || 'An error occurred during verification. Please try again.';
        },
      });
  }

  navigateToLogin(): void {
    this.router.navigate(['/admin/login']);
  }

  resendConfirmation(): void {
    if (!this.email && !this.userId) {
      this.errorMessage =
        'Email address not available. Please go to login and use the "Forgot Password" link.';
      return;
    }

    // ✅ If we have email from params or we need to get it from user
    const emailToUse = this.email;
    if (!emailToUse) {
      this.errorMessage = 'Email address not available. Please go to login.';
      return;
    }

    this.isResending = true;
    this.authService
      .resendConfirmation(emailToUse)
      .pipe(
        finalize(() => {
          this.isResending = false;
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.message =
              'A new confirmation email has been sent to your email address. Please check your inbox.';
            this.status = 'success';
          } else {
            this.errorMessage = response.message || 'Failed to resend confirmation email.';
          }
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || 'Failed to resend confirmation email. Please try again later.';
        },
      });
  }
}
