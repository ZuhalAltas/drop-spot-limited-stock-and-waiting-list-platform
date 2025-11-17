export interface User {
  id: number;
  email: string;
  password: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Drop {
  id: number;
  title: string;
  description: string;
  stock: number;
  claim_window_start: string;
  claim_window_end: string;
  created_at: string;
}

export interface WaitlistEntry {
  id: number;
  user_id: number;
  drop_id: number;
  priority_score: number;
  joined_at: string;
}

export interface Claim {
  id: number;
  user_id: number;
  drop_id: number;
  claim_code: string;
  claimed_at: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: 'user' | 'admin';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
