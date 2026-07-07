import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'teacher', 'student', 'new', or null
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkUserRole = async (userId) => {
    // Check teacher
    const { data: teacherData } = await supabase.from('teachers').select('id, is_admin').eq('id', userId).single();
    if (teacherData) {
      setUserRole('teacher');
      setIsAdmin(teacherData.is_admin === true);
      return;
    }
    // Check student
    const { data: studentData } = await supabase.from('students').select('id').eq('id', userId).single();
    if (studentData) {
      setUserRole('student');
      return;
    }
    setUserRole('new');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.id).then(() => setLoading(false));
      } else {
        setUserRole(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const saveProfileToLocal = (sessionUser, email, password, authMethod) => {
    try {
      const profilesStr = localStorage.getItem('areef_saved_profiles');
      let profiles = profilesStr ? JSON.parse(profilesStr) : [];
      profiles = profiles.filter(p => p.email !== email);
      profiles.push({
        id: sessionUser.id,
        email: email,
        full_name: sessionUser.user_metadata?.full_name || email.split('@')[0],
        authMethod: authMethod,
        password: password || null,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('areef_saved_profiles', JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  };

  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      // Attempt signup if user doesn't exist
      if (error.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        if (signUpData.user) {
          saveProfileToLocal(signUpData.user, email, password, 'email');
        }
        return signUpData;
      }
      throw error;
    }
    if (data.user) {
      saveProfileToLocal(data.user, email, password, 'email');
    }
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  };

  const signInWithMicrosoft = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email',
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    signInWithEmail,
    signInWithGoogle,
    signInWithMicrosoft,
    signOut,
    user,
    userRole,
    isAdmin,
    checkUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
