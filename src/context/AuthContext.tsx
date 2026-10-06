import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, UserRole, Language } from '../types';
import { INITIAL_USERS } from '../lib/mockData';
import { translations } from '../lib/translations';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  users: UserProfile[];
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.EN;
  login: (emailOrUsername: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updateUser: (user: UserProfile) => void;
  resetUserPassword: (userId: string, tempPass: string) => boolean;
  addUser: (user: Omit<UserProfile, 'id' | 'lastLogin'>) => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'vega_current_user_v1';
const LOCAL_STORAGE_USERS_KEY = 'vega_users_directory_v1';
const LOCAL_STORAGE_LANG_KEY = 'vega_language_v1';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Return null so new users / shared link visitors start at the login page
    return null;
  });

  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LANG_KEY);
      if (saved === 'EN' || saved === 'ID') return saved;
    } catch {
      // fallback
    }
    return 'EN';
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
    } catch {
      // ignore
    }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LOCAL_STORAGE_LANG_KEY, lang);
    } catch {
      // ignore
    }
  };

  const login = async (emailOrUsername: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    // Artificial small delay for real auth feeling
    await new Promise((r) => setTimeout(r, 400));

    const cleanInput = emailOrUsername.trim().toLowerCase();
    
    // Find matching user by email or username, with alias support for admin & viewer
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === cleanInput ||
        u.username.toLowerCase() === cleanInput ||
        (cleanInput === 'admin' && u.email === 'admin@it-ops.vega.corp') ||
        (cleanInput === 'viewer' && u.email === 'viewer@it-ops.vega.corp')
    );

    if (!found) {
      return { 
        success: false, 
        error: language === 'ID'
          ? 'Pengguna tidak ditemukan. Untuk demo prototype gunakan: admin@it-ops.vega.corp'
          : 'User not found. For prototype demo use: admin@it-ops.vega.corp'
      };
    }

    if (found.status === 'Suspended') {
      return { 
        success: false, 
        error: language === 'ID'
          ? 'Akun ditangguhkan. Silakan hubungi IT Security.'
          : 'Account is suspended. Please contact IT Security.' 
      };
    }

    // Passwords accepted: admin123 (or <role>123 or 'password')
    const validPasswords = [
      'admin123',
      'viewer123',
      'password',
      `${found.role.toLowerCase()}123`
    ];
    if (!validPasswords.includes(pass) && pass.length < 4) {
      return { 
        success: false, 
        error: language === 'ID'
          ? 'Kata sandi tidak valid. Gunakan kata sandi demo: admin123'
          : 'Invalid password. Please use prototype password: admin123' 
      };
    }

    // Update last login
    const updatedUser = {
      ...found,
      lastLogin: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) + ' WIB'
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchRole = (role: UserRole) => {
    const targetUser = users.find((u) => u.role === role) || {
      id: `usr-demo-${role.toLowerCase()}`,
      username: `${role.toLowerCase()}_demo`,
      fullName: `Demo ${role}`,
      email: `${role.toLowerCase()}@it-ops.vega.corp`,
      role,
      status: 'Active',
      department: 'IT Operations',
      lastLogin: 'Just now'
    };
    setCurrentUser(targetUser);
  };

  const updateUser = (updated: UserProfile) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    if (currentUser?.id === updated.id) {
      setCurrentUser(updated);
    }
  };

  const resetUserPassword = (userId: string, _tempPass: string): boolean => {
    const found = users.find((u) => u.id === userId);
    if (!found) return false;
    // in real DB update password; in demo record success
    return true;
  };

  const addUser = (userData: Omit<UserProfile, 'id' | 'lastLogin'>) => {
    const newUser: UserProfile = {
      ...userData,
      id: `usr-${Date.now()}`,
      lastLogin: 'Never'
    };
    setUsers((prev) => [newUser, ...prev]);
  };

  const t = translations[language];
  const isAdmin = currentUser?.role === 'Administrator';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        users,
        language,
        setLanguage,
        t,
        login,
        logout,
        switchRole,
        updateUser,
        resetUserPassword,
        addUser,
        isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
