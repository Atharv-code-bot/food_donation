// src/app/models/user.model.ts (Create this file if it doesn't exist)

export interface User {
  id?: number; // Optional, typically assigned by backend
  username: string;
  email: string;
  role: string; // Or a specific enum/type for roles if you define one
  fullname?: string | null; // Optional fields can be null
  phone?: string | null;
  address?: string | null;
  photoUrl?: string | null; // For the avatar image URL
  latitude?: number | null; // Matching backend type (Double in Java maps to number in TS)
  longitude?: number | null; // Matching backend type
  // Add any other properties your User object might have
}