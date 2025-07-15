const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Image Proxy Service is running' });
});

// Main proxy endpoint
app.get('/proxy-image', async (req, res) => {
  try {
    const { url, token } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    if (!token) {
      return res.status(400).json({ error: 'Token parameter is required' });
    }

    // Fetch the image from Monday.com
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch image from Monday.com',
        status: response.status,
        statusText: response.statusText
      });
    }

    // Get the image buffer
    const imageBuffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Set appropriate headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*'
    });

    // Send the image
    res.send(imageBuffer);

  } catch (error) {
    console.error('Error proxying image:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Alternative endpoint that returns a direct image URL (for cases where you need a permanent URL)
app.get('/get-image-url', async (req, res) => {
  try {
    const { url, token } = req.query;
    
    if (!url || !token) {
      return res.status(400).json({ error: 'URL and token parameters are required' });
    }

    // Verify the image exists and is accessible
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Image not accessible',
        status: response.status
      });
    }

    // Return the proxy URL
    const proxyUrl = `${req.protocol}://${req.get('host')}/proxy-image?url=${encodeURIComponent(url)}&token=${encodeURIComponent(token)}`;
    
    res.json({ 
      success: true,
      proxyUrl: proxyUrl,
      originalUrl: url
    });

  } catch (error) {
    console.error('Error generating proxy URL:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Image proxy service running on port ${port}`);
});
