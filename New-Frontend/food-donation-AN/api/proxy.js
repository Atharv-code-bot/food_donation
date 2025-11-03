// api/proxy.js

// 1. ADD THIS CONFIG - This is the most important change.
// This tells Vercel to NOT parse the request body.
export const config = {
  api: {
    bodyParser: false,
  },
};

// 2. This handler function is now updated
export default async function handler(request, response) {
  // Get the AWS URL from Vercel's environment variables
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return response.status(500).json({ error: 'API_URL is not configured' });
  }

  // Get the path from the incoming request (e.g., /auth/login)
  const path = request.url.replace('/api', '');

  // Build the full, insecure AWS URL
  const destinationUrl = `${apiUrl}${path}`;

  try {
    // Make the request to the real backend
    const apiResponse = await fetch(destinationUrl, {
      method: request.method,
      headers: {
        // Pass through essential headers.
        // DO NOT pass 'host', as it will be wrong.
        'Content-Type': request.headers['content-type'],
        'Authorization': request.headers['authorization'] || '',
      },
      // Pass the raw request body.
      // Since bodyParser is off, 'request' is the raw, unparsed stream.
      // 'fetch' can handle this correctly for both JSON and FormData.
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request : undefined,
    });

    // Send the backend's response back to the Angular app
    // We check the content-type to avoid errors if the response isn't JSON
    const contentType = apiResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await apiResponse.json();
      response.status(apiResponse.status).json(data);
    } else {
      // If it's not JSON (e.g., text, HTML), just send it as text
      const text = await apiResponse.text();
      response.status(apiResponse.status).send(text);
    }

  } catch (error) {
    console.error('Proxy error:', error);
    // This is the error you are seeing
    response.status(502).json({ error: 'Proxy request failed' });
  }
}