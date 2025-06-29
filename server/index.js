const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Expo } = require('expo-server-sdk');

const app = express();
const expo = new Expo();

app.use(cors());
app.use(bodyParser.json());

let savedPushTokens = [];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/save-token', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    if (!savedPushTokens.includes(token)) {
      savedPushTokens.push(token);
    }
    
    res.status(200).json({ success: true, message: 'Token saved successfully' });
  } catch (error) {
    console.error('Error saving token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/send-notification', async (req, res) => {
  try {
    const { title, body } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ 
        success: false,
        error: 'Title and body are required' 
      });
    }

    const messages = savedPushTokens
      .filter(token => Expo.isExpoPushToken(token))
      .map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: { withSome: 'data' },
      }));

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (chunkError) {
        console.error('Error sending chunk:', chunkError);
      }
    }
    
    res.status(200).json({ 
      success: true, 
      tickets,
      sentTo: savedPushTokens.length
    });
  } catch (error) {
    console.error('Error in send-notification:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send notifications' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});