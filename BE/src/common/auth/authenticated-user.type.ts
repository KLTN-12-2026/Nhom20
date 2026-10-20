export interface AuthenticatedUser {
  id: number;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  roles: string[];
}

export interface JwtPayload {
  sub: number;
  roles: string[];
}
