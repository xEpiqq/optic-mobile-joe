import { Stack } from 'expo-router';
import { SupabaseProvider } from '../contexts/SupabaseContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SupabaseProvider>
        <Stack screenOptions={{
          headerShown: false
        }}>
        </Stack>
      </SupabaseProvider>
    </GestureHandlerRootView>
  );
}