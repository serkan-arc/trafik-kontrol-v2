/**
 * Authentication Service Module
 * Handles user authentication, password validation, and JWT token generation
 */

import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { User, JWTPayload, LoginResponse } from '@/types/user';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Validate input
      if (!email || !password) {
        return {
          success: false,
          message: 'Email and password are required'
        };
      }

      // Find user by email
      const result = await db.query<User>(
        "SELECT * FROM users WHERE email = $1 AND status = 'active'",
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      const user = result.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Update last login timestamp
      await db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate JWT token
      const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

      // Store token in Redis for session management (optional)
      try {
        await redis.set(`session:${user.id}`, token, 7 * 24 * 60 * 60); // 7 days
      } catch (redisError) {
        console.warn('Redis session storage failed (non-critical):', (redisError as Error).message);
        // Continue without Redis - JWT is still valid
      }

      return {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: `${user.first_name} ${user.last_name}`.trim()
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login'
      };
    }
  }

  /**
   * Verify JWT token and return payload
   */
  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      
      // Check if session exists in Redis (optional, fallback to JWT only)
      try {
        const sessionExists = await redis.exists(`session:${decoded.userId}`);
        if (!sessionExists) {
          console.warn('Session not found in Redis, relying on JWT only');
          // Still allow login if JWT is valid, Redis is optional
        }
      } catch (redisError) {
        console.warn('Redis check failed (non-critical):', redisError);
        // Continue without Redis check - JWT is still valid
      }

      return decoded;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Logout user and invalidate session
   */
  static async logout(userId: string): Promise<boolean> {
    try {
      // Remove session from Redis
      try {
        await redis.del(`session:${userId}`);
      } catch (redisError) {
        console.warn('Redis logout failed (non-critical):', redisError);
        // Continue - logout is still successful without Redis
      }
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Hash password for new user creation
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Create new user (for admin use)
   */
  static async createUser(
    email: string,
    password: string,
    role: string,
    firstName: string,
    lastName: string
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      // Check if user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Insert new user
      const result = await db.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, status) 
         VALUES ($1, $2, $3, $4, $5, 'active') 
         RETURNING id`,
        [email.toLowerCase(), passwordHash, role, firstName, lastName]
      );

      return {
        success: true,
        message: 'User created successfully',
        userId: result.rows[0].id
      };
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        message: 'An error occurred while creating user'
      };
    }
  }
}
