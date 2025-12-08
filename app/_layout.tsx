import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'react-native';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>

        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: true, 
             headerTitle: () => (
              <Image
              source={require('@/assets/images/replateheaderlogowhite.png')}
              style={{ width: 120, height: 25, resizeMode: 'contain' }}
              />
         ),
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
            title: 'Terms of service',
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
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}