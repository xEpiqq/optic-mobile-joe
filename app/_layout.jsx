import { Stack } from 'expo-router';
import { SupabaseProvider } from '../contexts/SupabaseContext';

export default function Layout() {
  return (
    <SupabaseProvider>
      <Stack screenOptions={{
        headerShown: false
      }}>
      </Stack>
    </SupabaseProvider>
  );
}