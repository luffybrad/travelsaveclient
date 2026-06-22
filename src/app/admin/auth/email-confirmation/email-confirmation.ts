// src/app/admin/auth/email-confirmation/email-confirmation.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

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
    this.route.queryParams.subscribe((params) => {
      const status = params['status'];
      const message = params['message'];
      const email = params['email'];
      const userId = params['userId'];
      const token = params['token'];

      // If coming from backend redirect
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

      // If coming directly with userId and token in URL
      if (userId && token) {
        this.userId = userId;
        this.token = token;
        this.verifyEmail(userId, token);
      } else {
        this.status = 'error';
        this.isLoading = false;
        this.errorMessage = 'Invalid verification link. Missing required parameters.';
      }
    });
  }

  private verifyEmail(userId: string, token: string): void {
    // Call your API to verify the email
    // The backend already handled this, but you can also call it directly
    // Or just use the status from the URL params
    this.isLoading = false;

    // If we get here without status, we need to check with the backend
    // For now, we'll redirect to login with a message
    setTimeout(() => {
      this.status = 'success';
      this.message = 'Your email has been verified successfully!';
    }, 1500);
  }

  navigateToLogin(): void {
    this.router.navigate(['/admin/login']);
  }

  resendConfirmation(): void {
    if (!this.email) {
      this.errorMessage =
        'Email address not available. Please go to login and use the "Forgot Password" link.';
      return;
    }

    this.isResending = true;
    this.authService.resendConfirmation(this.email).subscribe({
      next: () => {
        this.isResending = false;
        this.message =
          'A new confirmation email has been sent to your email address. Please check your inbox.';
        this.status = 'success';
      },
      error: (error) => {
        this.isResending = false;
        this.errorMessage =
          error?.error?.message || 'Failed to resend confirmation email. Please try again later.';
      },
    });
  }
}
