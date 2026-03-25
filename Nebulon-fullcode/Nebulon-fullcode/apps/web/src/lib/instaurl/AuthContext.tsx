import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pw: string) => Promise<void>;
  signup: (email: string, pw: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  const login = async (email: string, pw: string) => {
    await signInWithEmailAndPassword(auth, email, pw);
  };
  const signup = async (email: string, pw: string) => {
    await createUserWithEmailAndPassword(auth, email, pw);
  };
  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };
  const logout = async () => {
    await signOut(auth);
  };
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
