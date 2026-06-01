import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ServerConnectionGate } from '@/components/ServerConnectionGate';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ServerConnectionGate>
        <Stack screenOptions={{ headerShown: false }} />
      </ServerConnectionGate>
      <StatusBar style="dark" />
    </QueryClientProvider>
  );
}
