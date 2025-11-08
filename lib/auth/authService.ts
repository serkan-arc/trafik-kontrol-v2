import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { db } from '@/lib/db';
import { securityConfig } from '@/lib/config/security';
import { AppError, ErrorType } from '@/lib/utils/errorHandler';
import logger from '@/lib/utils/logger';

// User interface
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  last_login?: Date;
}

// Token payload interface
export interface TokenPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Authentication service class
export class AuthService {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, securityConfig.bcrypt.saltRounds);
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT token
  static generateToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: '7d',
      algorithm: 'HS256'
    };
    
    return jwt.sign(payload, securityConfig.jwt.secret, options);
  }

  // Verify JWT token
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, securityConfig.jwt.secret) as TokenPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token has expired', ErrorType.AUTHENTICATION, 401);
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid token', ErrorType.AUTHENTICATION, 401);
      }
      throw error;
    }
  }

  // Register new user
  static async register(
    username: string,
    email: string,
    password: string,
    role: string = 'user'
  ): Promise<User> {
    // Validate input
    if (!username || !email || !password) {
      throw new AppError('Missing required fields', ErrorType.VALIDATION, 400);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', ErrorType.VALIDATION, 400);
    }

    // Password strength validation
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', ErrorType.VALIDATION, 400);
    }

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('User already exists', ErrorType.VALIDATION, 409);
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const result = await db.query(
      `INSERT INTO users (username, email, password, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, username, email, role, is_active, created_at`,
      [username, email, hashedPassword, role, true]
    );

    const user = result.rows[0];
    logger.info(`New user registered: ${username} (${email})`);

    return user;
  }

  // Login user
  static async login(username: string, password: string): Promise<{ user: User; token: string }> {
    // Find user
    const result = await db.query(
      `SELECT id, username, email, password, role, is_active, created_at, last_login
       FROM users
       WHERE (username = $1 OR email = $1) AND is_active = true`,
      [username]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', ErrorType.AUTHENTICATION, 401);
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await this.verifyPassword(password, user.password);
    if (!isValid) {
      // Log failed attempt
      await this.logFailedAttempt(user.id, username);
      throw new AppError('Invalid credentials', ErrorType.AUTHENTICATION, 401);
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    // Remove password from response
    delete user.password;

    logger.info(`User logged in: ${username}`);

    return { user, token };
  }

  // Logout user (invalidate token)
  static async logout(token: string): Promise<void> {
    // Add token to blacklist (stored in Redis or database)
    const decoded = this.verifyToken(token);
    
    // Store in sessions table as revoked
    await db.query(
      `INSERT INTO sessions (user_id, token, expires_at, revoked)
       VALUES ($1, $2, $3, true)`,
      [decoded.userId, token, new Date(decoded.exp! * 1000)]
    );

    logger.info(`User logged out: ${decoded.username}`);
  }

  // Get user by ID
  static async getUserById(userId: number): Promise<User | null> {
    const result = await db.query(
      `SELECT id, username, email, role, is_active, created_at, last_login
       FROM users
       WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  // Update user password
  static async updatePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get current password
    const result = await db.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', ErrorType.NOT_FOUND, 404);
    }

    // Verify old password
    const isValid = await this.verifyPassword(oldPassword, result.rows[0].password);
    if (!isValid) {
      throw new AppError('Invalid current password', ErrorType.AUTHENTICATION, 401);
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters', ErrorType.VALIDATION, 400);
    }

    // Hash and update password
    const hashedPassword = await this.hashPassword(newPassword);
    await db.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    logger.info(`Password updated for user ID: ${userId}`);
  }

  // Check if token is blacklisted
  static async isTokenRevoked(token: string): Promise<boolean> {
    const result = await db.query(
      'SELECT id FROM sessions WHERE token = $1 AND revoked = true',
      [token]
    );

    return result.rows.length > 0;
  }

  // Log failed login attempt
  private static async logFailedAttempt(userId: number | null, username: string): Promise<void> {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource, metadata, created_at)
       VALUES ($1, 'failed_login', 'auth', $2, CURRENT_TIMESTAMP)`,
      [userId, JSON.stringify({ username, timestamp: new Date() })]
    );
  }

  // Check user permissions
  static async hasPermission(userId: number, permission: string): Promise<boolean> {
    const result = await db.query(
      `SELECT r.permissions
       FROM users u
       JOIN roles r ON u.role = r.name
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const permissions = result.rows[0].permissions || [];
    return permissions.includes(permission);
  }
}