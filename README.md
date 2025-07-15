# Monday.com Image Proxy Service

A lightweight Node.js proxy service that converts private Monday.com image URLs into publicly accessible URLs. Perfect for integrating with services like YouTube, Zapier, or any application that needs access to Monday.com images without authentication.

## 🚀 Features

- **Convert Private URLs**: Transform authenticated Monday.com image URLs into public ones
- **Caching**: Built-in 1-hour cache for improved performance
- **CORS Support**: Works with web applications and APIs
- **Easy Integration**: Simple REST API endpoints
- **Zapier Compatible**: Designed for seamless Zapier automation workflows
- **Free Hosting**: Deployable on Render.com's free tier

## 📋 Prerequisites

- Node.js 14.0.0 or higher
- Monday.com API token
- GitHub account
- Render.com account (for deployment)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/monday-image-proxy.git
   cd monday-image-proxy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:3000`

### Deploy to Render.com

1. **Fork or clone this repository**

2. **Connect to Render.com**
   - Sign up at [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure deployment**
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

4. **Deploy**
   - Click "Create Web Service"
   - Your service will be available at `https://your-service-name.onrender.com`

## 📖 API Documentation

### Health Check
```http
GET /
```

**Response:**
```json
{
  "status": "Image Proxy Service is running"
}
```

### Proxy Image (Direct Image Access)
```http
GET /proxy-image?url={MONDAY_IMAGE_URL}&token={MONDAY_API_TOKEN}
```

**Parameters:**
- `url` (required): The private Monday.com image URL
- `token` (required): Your Monday.com API token

**Response:** Returns the image file directly with appropriate headers

**Example:**
```
https://your-service-name.onrender.com/proxy-image?url=https://mtdcnc.monday.com/protected_static/1049793/resources/2194631302/large-image.jpg&token=YOUR_TOKEN
```

### Get Proxy URL
```http
GET /get-image-url?url={MONDAY_IMAGE_URL}&token={MONDAY_API_TOKEN}
```

**Parameters:**
- `url` (required): The private Monday.com image URL
- `token` (required): Your Monday.com API token

**Response:**
```json
{
  "success": true,
  "proxyUrl": "https://your-service-name.onrender.com/proxy-image?url=...",
  "originalUrl": "https://mtdcnc.monday.com/protected_static/..."
}
```

## 🔧 Usage Examples

### With Zapier

Add a "Code by Zapier" step with this JavaScript code:

```javascript
const fetch = require('node-fetch');

const proxyServiceUrl = 'https://your-service-name.onrender.com';
const mondayImageUrl = inputData.mondayImageUrl;
const mondayToken = inputData.mondayApiToken;

const response = await fetch(`${proxyServiceUrl}/get-image-url?url=${encodeURIComponent(mondayImageUrl)}&token=${encodeURIComponent(mondayToken)}`);

const result = await response.json();

if (result.success) {
  return {
    publicImageUrl: result.proxyUrl,
    originalUrl: result.originalUrl
  };
} else {
  throw new Error(`Failed to get proxy URL: ${result.error}`);
}
```

### With cURL

```bash
curl "https://your-service-name.onrender.com/proxy-image?url=https://mtdcnc.monday.com/protected_static/1049793/resources/2194631302/large-image.jpg&token=YOUR_TOKEN"
```

### With JavaScript/Fetch

```javascript
const proxyUrl = 'https://your-service-name.onrender.com/proxy-image';
const params = new URLSearchParams({
  url: 'https://mtdcnc.monday.com/protected_static/1049793/resources/2194631302/large-image.jpg',
  token: 'YOUR_MONDAY_TOKEN'
});

const response = await fetch(`${proxyUrl}?${params}`);
const imageBlob = await response.blob();
```

## 🔐 Security Considerations

### Environment Variables (Recommended)

For production deployments, store your Monday.com API token as an environment variable:

1. **In Render.com dashboard:**
   - Go to your service settings
   - Add environment variable: `MONDAY_API_TOKEN`

2. **Update your code:**
   ```javascript
   const token = process.env.MONDAY_API_TOKEN || req.query.token;
   ```

### Rate Limiting

Consider implementing rate limiting for production use:

```bash
npm install express-rate-limit
```

## 🚨 Common Issues

### Image Not Loading
- Verify your Monday.com API token is valid
- Check that the image URL is accessible from your Monday.com account
- Ensure the URL is properly encoded

### CORS Issues
- The service includes CORS headers by default
- For custom domains, update the CORS configuration in `server.js`

### Performance on Free Tier
- Render.com free tier may have cold starts
- Consider upgrading to a paid plan for production use
- Images are cached for 1 hour to improve performance

## 📁 Project Structure

```
monday-image-proxy/
├── server.js          # Main application file
├── package.json       # Dependencies and scripts
├── README.md          # This file
└── .gitignore         # Git ignore rules
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/monday-image-proxy/issues)
- **Monday.com API**: [Monday.com Developer Docs](https://developer.monday.com/)
- **Render.com**: [Render.com Documentation](https://render.com/docs)

## 🙏 Acknowledgments

- Built for seamless integration with Zapier workflows
- Inspired by the need to bridge Monday.com's private assets with public services
- Thanks to the Monday.com and Render.com communities

---

**Need help?** Open an issue or check the documentation links above!
