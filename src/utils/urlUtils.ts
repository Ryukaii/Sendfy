import axios from "axios";

/**
 * Shortens a URL using an external URL shortening service.
 * 
 * @param url The URL to shorten
 * @returns The shortened URL or the original URL if shortening fails
 */
export async function shortenURL(url: string): Promise<string> {
  try {
    // Use environment variable for API key or service URL if available
    const apiKey = process.env.URL_SHORTENER_API_KEY;
    const shortenerUrl = process.env.URL_SHORTENER_SERVICE_URL;

    if (!apiKey || !shortenerUrl) {
      console.warn('URL shortener API key or service URL not configured. Using original URL.');
      return url;
    }

    // Call the URL shortening service
    const response = await axios.post(
      shortenerUrl,
      {
        url,
        apiKey
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      }
    );

    if (response.data && response.data.shortUrl) {
      return response.data.shortUrl;
    }

    // Fallback to original URL if response format is unexpected
    console.warn('URL shortener returned unexpected response format. Using original URL.');
    return url;
  } catch (error) {
    console.error('Error shortening URL:', error);
    // Return the original URL if there's any error
    return url;
  }
} 