import { createContext, useContext } from 'react';
import type { UserProfile, UserRole, Language } from '../types';
import { translations } from '../lib/translations';

export interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  users: UserProfile[];
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.EN;
  login: (emailOrUsername: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateUser: (user: UserProfile) => void | Promise<void>;
  resetUserPassword: (userId: string, tempPass: string) => boolean | Promise<boolean>;
  addUser: (user: Omit<UserProfile, 'id' | 'lastLogin'>, password?: string) => void | Promise<void>;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
