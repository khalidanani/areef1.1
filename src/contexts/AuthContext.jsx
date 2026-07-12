import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // Primary role
  const [userRoles, setUserRoles] = useState([]); // Array of all roles: ['teacher', 'student']
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function checkUserRole(userId) {
    if (!userId) return;
    try {
      let roles = [];
      let is_admin = false;
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lpyczfbiaoyaxuhnuacn.supabase.co';
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const r = await fetch(`${supabaseUrl}/functions/v1/update_role`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (r.ok) {
        const data = await r.json();
        if (data.in_teachers) roles.push('teacher');
        if (data.in_students) roles.push('student');
        is_admin = data.is_admin === true;
      } else {
        // Fallback to normal if edge function fails
        const { data: teacherData } = await supabase.from('teachers').select('id, is_admin').eq('id', userId).single();
        if (teacherData) {
          roles.push('teacher');
          is_admin = teacherData.is_admin === true;
        }
        const { data: studentData } = await supabase.from('students').select('id').eq('id', userId).single();
        if (studentData) {
          roles.push('student');
        }
      }

      if (roles.length === 0) {
        roles.push('new');
      }

      setUserRoles(roles);
      setIsAdmin(is_admin);
      // For backward compatibility, keep userRole as the primary role
      if (roles.includes('teacher')) {
        setUserRole('teacher');
      } else if (roles.includes('student')) {
        setUserRole('student');
      } else {
        setUserRole('new');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRoles(['new']);
      setUserRole('new');
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.id).then(() => setLoading(false));
      } else {
        setUserRole(null);
        setUserRoles([]);
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
        setUserRoles([]);
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

  const switchAccount = async () => {
    await supabase.auth.signOut();
  };

  const signOut = async () => {
    try {
      if (user && user.email) {
        const email = user.email;
        const profilesStr = localStorage.getItem('areef_saved_profiles');
        if (profilesStr) {
          let profiles = JSON.parse(profilesStr);
          profiles = profiles.filter(p => p.email !== email);
          localStorage.setItem('areef_saved_profiles', JSON.stringify(profiles));
        }
      }
    } catch (e) {
      console.error('Failed to clear saved profile on signout', e);
    }
    await supabase.auth.signOut();
  };

  const value = {
    signInWithEmail,
    signInWithGoogle,
    signInWithMicrosoft,
    signOut,
    switchAccount,
    user,
    userRole,
    userRoles,
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
