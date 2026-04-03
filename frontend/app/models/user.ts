export interface User {
  id?: number;
  username: string;
  fullName: string;
  email: string;
  role: string; // 'admin' | 'supervisor' | 'mechanic'
  active: boolean;
  mechanicId?: number | null;
  createdAt?: string;
}

export interface CreateUser {
  username: string;
  password: string;
  fullName?: string;
  email?: string;
  role?: string;
  active?: boolean;
  mechanicId?: number | null;
}

export interface UpdateUser {
  username?: string;
  password?: string;
  fullName?: string;
  email?: string;
  role?: string;
  active?: boolean;
  mechanicId?: number | null;
}
