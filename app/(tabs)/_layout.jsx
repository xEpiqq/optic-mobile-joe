import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSupabase } from '../../contexts/SupabaseContext';

export default function TabLayout() {
  const { supabase, loading } = useSupabase();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    // Ensure Supabase client is initialized
    if (loading) return;

    // If supabase client is missing, redirect to login
    if (!supabase) {
      router.replace("/(auth)/login");
      return;
    }

    // Check and rehydrate the session on initial load
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/(auth)/login");
      }
      setSessionChecked(true); // Mark session as checked
    };

    checkSession();

    // Set up listener for auth state changes (e.g., logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/(auth)/login");
      } else {
        setSessionChecked(true); // Session active
      }
    });

    return () => {
      authListener.subscription?.unsubscribe();
    };
  }, [supabase, loading]);

  // Show loading indicator until session is verified
  if (loading || !sessionChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1c1c1c' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { display: 'none' },
        tabBarActiveTintColor: 'blue',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
        }}
      />
    </Tabs>
  );
}
