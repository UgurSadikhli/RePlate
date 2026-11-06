import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AppProvider } from '@/context/AppContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#4CAF50',
    background: '#000000',
    card: '#0A0A0A',
    text: '#FFFFFF',
    border: '#1E1E1E',
  },
};

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemeProvider value={CustomDarkTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0A0A0A' },
            headerTintColor: '#4CAF50',
            headerTitleStyle: { fontWeight: '700', color: '#FFFFFF', fontSize: 17 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: '#000000' },
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />

          <Stack.Screen
            name="pages/aboutus"
            options={{
              title: 'About Us',
              headerBackTitle: 'Home',
            }}
          />
          <Stack.Screen
            name="pages/contactus"
            options={{
              title: 'Contact Us',
              headerBackTitle: 'Home',
            }}
          />
          <Stack.Screen
            name="pages/howtouse"
            options={{
              title: 'How to Use',
              headerBackTitle: 'Home',
            }}
          />
          <Stack.Screen
            name="pages/privacy"
            options={{
              title: 'Privacy',
              headerBackTitle: 'Home',
            }}
          />
          <Stack.Screen
            name="pages/termsofservice"
            options={{
              title: 'Terms of Service',
              headerBackTitle: 'Home',
            }}
          />
          <Stack.Screen
            name="pages/settings"
            options={{
              title: 'Settings',
              headerBackTitle: 'Home',
            }}
          />

          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>

        <StatusBar style="light" />
      </ThemeProvider>
    </AppProvider>
  );
}
