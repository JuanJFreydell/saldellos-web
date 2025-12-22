// TypeScript types for the users table
export interface User {
  user_id: string; // UUID
  status: string;
  join_date: string; // ISO timestamp string
  first_names: string | null;
  last_names: string | null;
  email: string;
  nextauth_id: string | null;
}

export interface InsertUser {
  user_id?: string; // Optional, will be generated if not provided
  status?: string; // Optional, defaults to 'active'
  join_date?: string; // Optional, defaults to NOW()
  first_names?: string | null;
  last_names?: string | null;
  email: string;
  nextauth_id?: string | null;
}

export interface UpdateUser {
  status?: string;
  first_names?: string | null;
  last_names?: string | null;
  email?: string;
  nextauth_id?: string | null;
}

