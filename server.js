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

    // Try different authentication methods for Monday.com
    let response;
    let lastError;

    // Method 1: Bearer token
    try {
      response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://mtdcnc.monday.com/',
          'Origin': 'https://mtdcnc.monday.com'
        }
      });
      
      if (response.ok) {
        console.log('Success with Bearer token');
      } else {
        lastError = `Bearer token failed: ${response.status}`;
        throw new Error(lastError);
      }
    } catch (error) {
      console.log('Bearer token method failed:', error.message);
      
      // Method 2: API key in header
      try {
        response = await fetch(url, {
          headers: {
            'Authorization': token,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://mtdcnc.monday.com/',
            'Origin': 'https://mtdcnc.monday.com'
          }
        });
        
        if (response.ok) {
          console.log('Success with direct token');
        } else {
          lastError = `Direct token failed: ${response.status}`;
          throw new Error(lastError);
        }
      } catch (error2) {
        console.log('Direct token method failed:', error2.message);
        
        // Method 3: Query parameter
        try {
          const urlWithToken = `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
          response = await fetch(urlWithToken, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://mtdcnc.monday.com/',
              'Origin': 'https://mtdcnc.monday.com'
            }
          });
          
          if (response.ok) {
            console.log('Success with query parameter token');
          } else {
            lastError = `Query parameter failed: ${response.status}`;
            throw new Error(lastError);
          }
        } catch (error3) {
          console.log('Query parameter method failed:', error3.message);
          
          // Method 4: No auth (sometimes protected_static URLs don't need auth)
          try {
            response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://mtdcnc.monday.com/',
                'Origin': 'https://mtdcnc.monday.com'
              }
            });
            
            if (response.ok) {
              console.log('Success with no auth');
            } else {
              throw new Error(`No auth failed: ${response.status}`);
            }
          } catch (error4) {
            console.log('All methods failed');
            throw new Error(`All authentication methods failed. Last error: ${error4.message}`);
          }
        }
      }
    }

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

    // Verify the image exists and is accessible with browser-like headers
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site'
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

// Debug endpoint to test different auth methods
app.get('/debug-auth', async (req, res) => {
  const { url, token } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  const results = [];

  // Test different auth methods
  const methods = [
    {
      name: 'Bearer Token',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
        'Referer': 'https://mtdcnc.monday.com/'
      }
    },
    {
      name: 'Direct Token',
      headers: {
        'Authorization': token,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
        'Referer': 'https://mtdcnc.monday.com/'
      }
    },
    {
      name: 'No Auth',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
        'Referer': 'https://mtdcnc.monday.com/'
      }
    }
  ];

  for (const method of methods) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: method.headers
      });
      
      results.push({
        method: method.name,
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
    } catch (error) {
      results.push({
        method: method.name,
        error: error.message,
        success: false
      });
    }
  }

  // Also try with query parameter
  if (token) {
    try {
      const urlWithToken = `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
      const response = await fetch(urlWithToken, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8',
          'Referer': 'https://mtdcnc.monday.com/'
        }
      });
      
      results.push({
        method: 'Query Parameter',
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
    } catch (error) {
      results.push({
        method: 'Query Parameter',
        error: error.message,
        success: false
      });
    }
  }

  res.json({
    url,
    tokenProvided: !!token,
    results
  });
});

// Alternative endpoint for Monday.com session-based auth
app.get('/proxy-image-session', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // For session-based authentication (when user is logged into Monday.com)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://mtdcnc.monday.com/',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-origin'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch image from Monday.com',
        status: response.status,
        statusText: response.statusText
      });
    }

    const imageBuffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    res.set({
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });

    res.send(imageBuffer);

  } catch (error) {
    console.error('Error proxying image:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Image proxy service running on port ${port}`);
});
