import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Button, Alert, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BACKEND_URL = 'https://push-notification-expo.onrender.com';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        storePushToken(token);
      }
    });

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification responses (user taps on notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const storePushToken = async (token) => {
    try {
      await AsyncStorage.setItem('pushToken', token);
      console.log('Push token stored locally');
      
      // Send token to backend
      const response = await fetch(`${BACKEND_URL}/save-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      console.log('Token saved on backend:', data);
    } catch (error) {
      console.error('Error storing push token:', error);
    }
  };

 const sendNotificationToAll = async () => {
  setIsLoading(true);
  try {
    const response = await fetch(`${BACKEND_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Hello Everyone!',
        body: 'This is a test notification sent to all users!',
      }),
    });

    // First check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error(`Server returned ${response.status}: ${text}`);
    }

    const data = await response.json();
    
    if (data.success) {
      Alert.alert('Success', 'Notification sent to all users!');
    } else {
      Alert.alert('Error', data.error || 'Failed to send notification');
    }
  } catch (error) {
    console.error('Full error:', error);
    Alert.alert('Error', error.message || 'Failed to connect to server');
  } finally {
    setIsLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Push Notification Demo</Text>
      <Text style={styles.token}>Your device token:</Text>
      <Text style={styles.tokenValue}>{expoPushToken || 'Generating...'}</Text>
      
      <View style={styles.buttonContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#0000ff" />
        ) : (
          <Button
            title="Send Test Notification"
            onPress={sendNotificationToAll}
          />
        )}
      </View>
    </View>
  );
}

async function registerForPushNotificationsAsync() {
  let token;

  if (!Device.isDevice) {
    Alert.alert('Must use physical device for Push Notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('Failed to get push token for push notification!');
    return;
  }

  // Get the token that identifies this device
  token = (await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig.extra.eas.projectId,
  })).data;

  // Set the notification channel for Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  token: {
    fontSize: 16,
    marginTop: 10,
  },
  tokenValue: {
    fontSize: 14,
    color: '#666',
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
  },
  buttonContainer: {
    marginTop: 30,
    width: '80%',
  },
});