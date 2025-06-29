// server.js
const express = require('express');
const { Expo } = require('expo-server-sdk');
const app = express();
const expo = new Expo();

app.use(express.json());

// In production, use a database to store tokens
const tokens = [];

// Endpoint to register tokens
app.post('/register-token', (req, res) => {
  const { token } = req.body;
  if (!Expo.isExpoPushToken(token)) {
    return res.status(400).json({ error: 'Invalid token' });
  }
  if (!tokens.includes(token)) {
    tokens.push(token);
  }
  res.json({ success: true });
});

// Endpoint to send to all devices
app.post('/send-to-all', async (req, res) => {
  const { title, body } = req.body;
  
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title: title || 'Hello!',
    body: body || 'This is a notification to all users',
    data: { withSome: 'data' },
  }));

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    
    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));