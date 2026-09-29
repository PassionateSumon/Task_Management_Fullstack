export interface AssignedRole {
  id: number;
  name: string;
  is_system: boolean;
}

export interface AuthState {
  isLoggedIn: boolean;
  /** Used to hide destructive/self-referential actions such as "delete me". */
  userId: number | null;
  email: string | null;
  role: string | null;
  /**
   * Effective permission names resolved server-side for the current user.
   * Authoritative source is the backend; this list only drives UI visibility.
   */
  permissions: string[];
  /** The user's role record (may be a dynamic role, not just admin/user). */
  assignedRole: AssignedRole | null;
  loading: boolean;
  error: string | null;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  user_type?: string;
}

export interface LoginPayload {
  emailOrUsername: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface OtpPayload {
  email: string;
  otp: string;
}

export interface AuthProps {
  from: "signup" | "login";
}

export interface FormData {
  name?: string;
  email?: string;
  emailOrUsername: string;
  password: string;
  user_type?: string;
}