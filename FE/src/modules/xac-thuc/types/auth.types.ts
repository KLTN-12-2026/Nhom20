export interface AuthenticatedUser {
  id: number;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  roles: string[];
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUser;
}
