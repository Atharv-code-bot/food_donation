// api/proxy.js
// This uses Node.js 'fetch', available in recent Node.js versions.
export default async function handler(request, response) {
  // 1. Get the AWS URL from Vercel's environment variables
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return response.status(500).json({ error: 'API_URL is not configured' });
  }

  // 2. Get the path from the incoming request (e.g., /auth/login)
  // We remove the '/api' prefix from the URL.
  const path = request.url.replace('/api', '');

  // 3. Build the full, insecure AWS URL
  const destinationUrl = `${apiUrl}${path}`;

  try {
    // 4. Make the request to the real backend
    const apiResponse = await fetch(destinationUrl, {
      method: request.method,
      headers: {
        // Pass through essential headers
        'Content-Type': request.headers['content-type'] || 'application/json',
        'Authorization': request.headers['authorization'] || '',
        // Add any other custom headers you need
      },
      // Pass through the body if it exists
      body: request.method !== 'GET' && request.method !== 'HEAD' ? JSON.stringify(request.body) : undefined,
    });

    // 5. Send the backend's response back to the Angular app
    const data = await apiResponse.json();
    response.status(apiResponse.status).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    response.status(502).json({ error: 'Proxy request failed' });
  }
}