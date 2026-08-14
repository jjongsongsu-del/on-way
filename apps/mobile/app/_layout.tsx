import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ServerConnectionGate } from '@/components/ServerConnectionGate';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
  const isPublicRoute = pathname === '/privacy-policy';

  const appStack = <Stack screenOptions={{ headerShown: false }} />;

  return (
    <QueryClientProvider client={queryClient}>
      {isPublicRoute ? appStack : <ServerConnectionGate>{appStack}</ServerConnectionGate>}
      <StatusBar style="dark" />
    </QueryClientProvider>
  );
}
