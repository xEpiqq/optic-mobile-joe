import React, { useState } from 'react';
import { Alert, View, TextInput, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useSupabase } from '../../contexts/SupabaseContext';
import { router } from 'expo-router';

export default function Login() {
  const { supabase } = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    if (!supabase) {
      Alert.alert("Error", "Supabase client not initialized.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert("Authentication Error", error.message);
    } else {
      router.replace("/(tabs)");
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-zinc-900 px-6 pb-6 justify-center items-center">
      {/* Logo positioned at the top left */}
      <View className="absolute top-12 left-6">
        {/* <Image
          source={require('../assets/images/logo.png')}
          className="w-14 h-8 opacity-30"
        /> */}
      </View>

      {/* Centered Title and Subtext */}
      <View className="items-center mt-8">
        <Text className="text-zinc-100 text-2xl font-bold">Optic D2D</Text>
        <Text className="text-zinc-400 text-lg mt-1">Sell Fiber Fast</Text>
      </View>

      {/* Input Fields */}
      <View className="w-full max-w-md space-y-4 mt-8">
        <TextInput
          className="bg-zinc-800 text-white placeholder-white rounded-md border border-gray-700 py-2 px-4"
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="Email"
          placeholderTextColor="white"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="bg-zinc-800 text-white placeholder-white rounded-md border border-gray-700 py-2 px-4"
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Password"
          placeholderTextColor="white"
          autoCapitalize="none"
        />
      </View>

      {/* Forgot password and Remember me */}
      <View className="flex-row items-center justify-between w-full max-w-md mt-4">
        <TouchableOpacity>
          <Text className="text-indigo-400">Forgot password?</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text className="text-sm text-zinc-400">Remember me</Text>
        </TouchableOpacity>
      </View>

      {/* Sign In Button */}
      <View className="w-full max-w-md mt-6">
        <TouchableOpacity
          className={`bg-indigo-600 py-2 rounded-md text-center ${loading ? 'opacity-50' : ''}`}
          disabled={loading}
          onPress={signInWithEmail}
        >
          <Text className="text-zinc-100 text-center font-semibold">
            {loading ? <ActivityIndicator color="#ffffff" /> : 'Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}