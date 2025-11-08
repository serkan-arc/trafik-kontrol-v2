/**
 * User Type Definitions
 */

export type UserRole = 'admin' | 'sub_admin' | 'network' | 'lead_manager';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
  status: string;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  last_login_at?: Date;
  last_login_ip?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    fullName?: string;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
