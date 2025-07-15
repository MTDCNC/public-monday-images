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

    console.log('Attempting to fetch:', url);

    // Try different authentication methods for Monday.com
    let response;
    let lastError;

    // Method 1: Monday.com API approach - get file info first
    try {
      // First, try to get file info via Monday.com API
      const apiResponse = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `query { 
            assets(ids: []) { 
              id 
              name 
              url 
              file_extension 
              created_at 
            } 
          }`
        })
      });

      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log('Monday.com API response:', apiData);
      }
    } catch (apiError) {
      console.log('Monday.com API failed:', apiError.message);
    }

    // Method 2: Direct image access with proper headers
    const authMethods = [
      {
        name: 'Bearer with cookies',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://mtdcnc.monday.com/',
          'Origin': 'https://mtdcnc.monday.com',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        }
      },
      {
        name: 'Session-based',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://mtdcnc.monday.com/',
          'Cookie': `auth_token=${token}` // Try token as cookie
        }
      },
      {
        name: 'Query parameter',
        url: `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': 'https://mtdcnc.monday.com/'
        }
      }
    ];

    for (const method of authMethods) {
      try {
        console.log(`Trying method: ${method.name}`);
        
        response = await fetch(method.url || url, {
          headers: method.headers,
          redirect: 'manual' // Don't follow redirects to login page
        });

        console.log(`${method.name} - Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`);

        // Check if we got an actual image (not HTML)
        const contentType = response.headers.get('content-type');
        
        if (response.ok && contentType && contentType.startsWith('image/')) {
          console.log(`Success with ${method.name} - got image`);
          break;
        } else if (response.status === 302 || response.status === 301) {
          console.log(`${method.name} - Redirect detected (likely to login)`);
          continue;
        } else if (contentType && contentType.includes('text/html')) {
          console.log(`${method.name} - Got HTML (likely login page)`);
          continue;
        } else {
          console.log(`${method.name} - Unexpected response`);
          continue;
        }
      } catch (error) {
        console.log(`${method.name} failed:`, error.message);
        lastError = error.message;
        continue;
      }
    }

    // If we still don't have a proper image response
    if (!response || !response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
      return res.status(403).json({ 
        error: 'Unable to access image - Monday.com is redirecting to login page',
        suggestion: 'The API token may not have permission to access this image, or the image requires different authentication',
        lastError: lastError,
        receivedContentType: response?.headers.get('content-type')
      });
    }

    // Get the image buffer
    const imageBuffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Set appropriate headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=3600',
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
