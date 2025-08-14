import { Stack } from 'expo-router';
import { SupabaseProvider } from '../contexts/SupabaseContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SupabaseProvider>
          <Stack screenOptions={{
            headerShown: false
          }}>
          </Stack>
        </SupabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}