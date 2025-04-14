import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useSupabase } from '../../contexts/SupabaseContext';
import { router } from 'expo-router';

export default function SelectOrganization() {
  const { selectOrganization, loading } = useSupabase();

  const handleSelectOrg = async (orgId) => {
    await selectOrganization(orgId); // Ensure org selection and client reinitialization
    if (!loading) {
      router.replace('/(auth)/login'); // Navigate to login after loading completes
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-900">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-900 px-6 pb-6 justify-center items-center">
      {/* Logo positioned at the top left */}
      <View className="absolute top-12 left-6">
        <Image
          source={require('../../assets/images/logo.png')}
          className="w-14 h-8 opacity-30"
        />
      </View>

      {/* Title and Subtitle */}
      <View className="items-center mt-8">
        <Text className="text-zinc-100 text-2xl font-bold">Optic D2D</Text>
        <Text className="text-zinc-400 text-lg mt-1">Select Your Organization</Text>
      </View>

      {/* Organization Options */}
      <View className="w-full max-w-md space-y-4 mt-8">
        <TouchableOpacity
          onPress={() => handleSelectOrg('org1')}
          className="bg-red-900 py-4 rounded-md"
        >
          <Text className="text-zinc-100 text-center font-semibold">Anand's Team</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSelectOrg('org2')}
          className="bg-green-900 py-4 rounded-md"
        >
          <Text className="text-zinc-100 text-center font-semibold">Greg's Team</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSelectOrg('org3')}
          className="bg-blue-900 py-4 rounded-md"
        >
          <Text className="text-zinc-100 text-center font-semibold">Invictus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSelectOrg('org4')}
          className="bg-purple-900 py-4 rounded-md"
        >
          <Text className="text-zinc-100 text-center font-semibold">Blake's Team</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleSelectOrg('org5')}
          className="bg-zinc-900 py-4 rounded-md"
        >
          <Text className="text-zinc-100 text-center font-semibold">Paul's Team</Text>
        </TouchableOpacity>
        {/* Add more organizations if needed */}
      </View>
    </View>
  );
}
