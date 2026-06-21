// src/app/admin/forgot-password/forgot-password.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
})
export class ForgotPasswordComponent {
  forgotForm!: FormGroup;
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.successMessage = null;
    this.errorMessage = null;

    this.authService
      .forgotPassword(this.forgotForm.value.email)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage =
              response.message || 'If your email is registered, you will receive an OTP.';
          } else {
            this.errorMessage = response.message || 'An error occurred. Please try again.';
          }
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || 'An unexpected error occurred. Please try again.';
        },
      });
  }

  get email() {
    return this.forgotForm.get('email');
  }
}
