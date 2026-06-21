// src/app/admin/register/register.ts
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  selector: 'app-admin-register',
  templateUrl: './register.html',
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showAdminSecret = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group(
      {
        userName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
        adminSecret: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    return password && confirmPassword && password.value !== confirmPassword.value
      ? { passwordMismatch: true }
      : null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const { userName, email, password, adminSecret } = this.registerForm.value;

    this.authService
      .registerAdmin({ userName, email, password, adminSecret })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = response.message || 'Admin account created successfully!';
            setTimeout(() => {
              this.router.navigate(['/admin/login']);
            }, 3000);
          } else {
            this.errorMessage = response.message || 'Registration failed. Please try again.';
            if (response.errors) {
              const firstError = Object.values(response.errors)[0]?.[0];
              if (firstError) {
                this.errorMessage = firstError;
              }
            }
          }
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || 'An unexpected error occurred. Please try again.';
        },
      });
  }

  get userName() {
    return this.registerForm.get('userName');
  }
  get email() {
    return this.registerForm.get('email');
  }
  get password() {
    return this.registerForm.get('password');
  }
  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }
  get adminSecret() {
    return this.registerForm.get('adminSecret');
  }
}
