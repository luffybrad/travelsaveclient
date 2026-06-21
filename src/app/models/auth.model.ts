// src/app/models/auth.model.ts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  userName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminRegisterRequest {
  userName: string;
  email: string;
  password: string;
  adminSecret: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    userName: string;
    roles: string[];
  };
  statusCode: number;
  errors?: Record<string, string[]>;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  statusCode: number;
  timestamp: string;
}
