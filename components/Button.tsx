import React from 'react';
import { Button, View } from 'react-native';

export default function NotificationButton() {
  const sendNotificationToAll = async () => {
    const response = await fetch('https://your-backend.com/send-notification', {
      method: 'POST',
    });
    const resJson = await response.json();
    console.log('Notification sent:', resJson);
  };

  return (
    <View>
      <Button title="Notify All Users" onPress={sendNotificationToAll} />
    </View>
  );
}
