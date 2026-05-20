import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="lga" />
      <Stack.Screen name="ward" />
      <Stack.Screen name="pin" />
    </Stack>
  );
}
