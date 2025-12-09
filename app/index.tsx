import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Use updated import

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#e6f2ff" />
      
      <View style={styles.container}>
        
        {/* --- HERO SECTION --- */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="domain" size={80} color="#004aad" />
          </View>
          
          <Text style={styles.title}>Classroom Checker</Text>
          <Text style={styles.subtitle}>
            Find available rooms, check schedules, and manage campus spaces in real-time.
          </Text>
        </View>

        {/* --- BUTTON SECTION --- */}
        <View style={styles.buttonSection}>
          
          <TouchableOpacity 
            style={styles.btnPrimary} 
            onPress={() => router.push('/auth/login' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnTextWhite}>Log In</Text>
                      

          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.btnOutline} 
            onPress={() => router.push('/auth/register' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.btnTextBlue}>Create Account</Text>
          </TouchableOpacity>

        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Developed By Marl Laurence Soriano</Text>
      

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e6f2ff' }, 
  container: {
    flex: 1, paddingHorizontal: 24, paddingVertical: 40,
    justifyContent: 'space-between', backgroundColor: '#e6f2ff',
  },
  heroSection: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  iconContainer: {
    width: 140, height: 140,
    backgroundColor: '#cce0ff',
    borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 32,
    shadowColor: '#004aad', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  title: {
    fontSize: 32, fontWeight: '800', color: '#002855',
    textAlign: 'center', marginBottom: 12, letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16, color: '#5b7c99',
    textAlign: 'center', lineHeight: 24, paddingHorizontal: 20,
  },
  buttonSection: { width: '100%', gap: 16, marginBottom: 20 },
  btnPrimary: {
    backgroundColor: '#004aad',
    height: 58, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#004aad', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  btnTextWhite: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  btnIconRight: { marginLeft: 8 },
  btnOutline: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#004aad', 
  },
  btnTextBlue: { color: '#004aad', fontSize: 18, fontWeight: '700' },
  footer: { alignItems: 'center', marginBottom: 10 },
  footerText: { color: '#5b7c99', fontSize: 12, fontWeight: '500' },
});