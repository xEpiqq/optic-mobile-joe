import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single Supabase instance configuration
const supabaseUrl = 'https://dcftyljfxsaauxtygbnz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZnR5bGpmeHNhYXV4dHlnYm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzNTE1MTgsImV4cCI6MjA2MDkyNzUxOH0.FK6O3oI9nMNYJc19d7NBnWj73M1cYwXgJdA4glZCQSs'

const SupabaseContext = createContext();

export function SupabaseProvider({ children }) {
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const initializeSupabaseClient = async () => {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    const sessionData = await AsyncStorage.getItem('@session');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      await client.auth.setSession(session);
    }

    client.auth.onAuthStateChange(async (_, session) => {
      if (session) {
        await AsyncStorage.setItem('@session', JSON.stringify(session));
      } else {
        await AsyncStorage.removeItem('@session');
      }
    });

    setSupabaseClient(client);
    setLoading(false);
  };

  useEffect(() => {
    initializeSupabaseClient();
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase: supabaseClient, loading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}
