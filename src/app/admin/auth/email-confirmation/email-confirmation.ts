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

      // ✅ Check for status param from redirect (backward compatibility)
      const statusParam = params['status'];
      const messageParam = params['message'];
      const emailParam = params['email'];
      const userIdParam = params['userId'];
      const tokenParam = params['token'];

      // If we have userId and token, call the API
      if (userIdParam && tokenParam) {
        this.userId = userIdParam;
        this.token = tokenParam;
        this.email = emailParam ? decodeURIComponent(emailParam) : null;
        this.verifyEmailWithApi(userIdParam, tokenParam);
        return;
      }

      // If coming from backend redirect with status (backward compatibility)
      if (statusParam) {
        this.status = statusParam === 'success' ? 'success' : 'error';
        this.isLoading = false;
        this.message = messageParam
          ? decodeURIComponent(messageParam)
          : statusParam === 'success'
            ? 'Your email has been verified!'
            : 'Verification failed';
        this.email = emailParam ? decodeURIComponent(emailParam) : null;
        return;
      }

      // No valid parameters found
      this.status = 'error';
      this.isLoading = false;
      this.errorMessage = 'Invalid verification link. Missing required parameters.';
    });
  }

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

          // ✅ Check if the error has a message from the backend
          if (error?.error?.message) {
            this.errorMessage = error.error.message;
          } else if (error?.message) {
            this.errorMessage = error.message;
          } else {
            this.errorMessage = 'An error occurred during verification. Please try again.';
          }

          this.status = 'error';
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

    // Try to get email from params or prompt user
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
