// Disable automatic body parsing by Vercel
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    const apiUrl = process.env.API_URL; // e.g. "http://your-aws-server:8080"
    if (!apiUrl) {
      return res.status(500).json({ error: "API_URL is not configured" });
    }

    // Remove `/api` prefix to get the backend path
    const targetPath = req.url.replace(/^\/api/, "");
    const destinationUrl = `${apiUrl}${targetPath}`;

    // ✅ Prepare headers safely
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== "host") {
        headers.append(key, value);
      }
    }

    // ✅ Handle body correctly
    let body = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks);
    }

    // ✅ Forward the request to backend
    const backendResponse = await fetch(destinationUrl, {
      method: req.method,
      headers,
      body,
    });

    // ✅ Copy backend response headers
    backendResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // ✅ Return response body correctly
    const contentType = backendResponse.headers.get("content-type") || "";
    res.status(backendResponse.status);

    if (contentType.includes("application/json")) {
      const data = await backendResponse.json();
      res.json(data);
    } else {
      const text = await backendResponse.text();
      res.send(text);
    }
  } catch (err) {
    console.error("❌ Proxy error:", err);
    res.status(502).json({ error: "Proxy request failed", details: err.message });
  }
}
