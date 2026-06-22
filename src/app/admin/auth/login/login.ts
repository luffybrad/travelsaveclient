// src/app/admin/auth/login/login.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  selector: 'app-admin-login',
  templateUrl: './login.html',
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  returnUrl: string = '/admin';
  showResendLink = false;
  emailForResend: string | null = null;
  isResending = false;
  resendSuccess = false;
  resendMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.showResendLink = false;
    this.resendSuccess = false;
    this.resendMessage = null;

    const { email, password } = this.loginForm.value;
    this.emailForResend = email;

    this.authService
      .loginAdmin({ email, password })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.router.navigate([this.returnUrl]);
          } else {
            this.errorMessage = response.message || 'Login failed. Please try again.';
            // ✅ Check if the error message is about email confirmation
            if (this.errorMessage.toLowerCase().includes('confirm your email')) {
              this.showResendLink = true;
            }
          }
        },
        error: (error) => {
          const message =
            error?.error?.message || 'An unexpected error occurred. Please try again.';
          this.errorMessage = message;
          // ✅ Check if the error message is about email confirmation
          if (message.toLowerCase().includes('confirm your email')) {
            this.showResendLink = true;
          }
        },
      });
  }

  resendConfirmation(): void {
    if (!this.emailForResend) {
      this.resendMessage = 'Email address not available. Please enter your email and try again.';
      return;
    }

    this.isResending = true;
    this.resendSuccess = false;
    this.resendMessage = null;

    this.authService.resendConfirmation(this.emailForResend).subscribe({
      next: (response) => {
        this.isResending = false;
        if (response.success) {
          this.resendSuccess = true;
          this.resendMessage =
            response.message ||
            'A new confirmation email has been sent to your email address. Please check your inbox.';
          // ✅ Hide the resend link after successful resend
          this.showResendLink = false;
        } else {
          this.resendMessage =
            response.message || 'Failed to resend confirmation email. Please try again.';
        }
      },
      error: (error) => {
        this.isResending = false;
        this.resendMessage =
          error?.error?.message || 'Failed to resend confirmation email. Please try again later.';
      },
    });
  }

  get email() {
    return this.loginForm.get('email');
  }
  get password() {
    return this.loginForm.get('password');
  }
}
