import { NextRequest, NextResponse } from 'next/server';

// Helper function to make request with timeout and retry
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries = 3, 
  timeout = 60000 // Increased to 60 seconds
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If we get 520, 522, 524 (Cloudflare errors), retry
      if (i < retries - 1 && (response.status === 520 || response.status === 522 || response.status === 524)) {
        console.warn(`Attempt ${i + 1} failed with status ${response.status}, retrying...`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If it's the last retry or not a network error, throw
      if (i === retries - 1) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      console.warn(`Attempt ${i + 1} failed, retrying...`, error);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }

  throw new Error('Max retries reached');
}

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authorization = request.headers.get('authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const wstoken = authorization.split(' ')[1];
    
    // Get parameters from request body
    const body = await request.json();
    const { wsfunction, moodlewsrestformat, ...otherParams } = body;

    // Validate required parameters
    if (!wsfunction) {
      return NextResponse.json(
        { error: 'Missing required parameter: wsfunction' },
        { status: 400 }
      );
    }

    // Get base URL from environment or request
    const baseUrl = process.env.NEXT_PUBLIC_MOODLE_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Moodle base URL not configured' },
        { status: 500 }
      );
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      wstoken,
      wsfunction,
      moodlewsrestformat: moodlewsrestformat || 'json',
      ...Object.entries(otherParams).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>),
    });

    const url = `${baseUrl}/webservice/rest/server.php?${queryParams.toString()}`;
    console.log('Making request to URL:', url);

    // Make request with retry logic
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }, 3, 60000); // 3 retries, 60 second timeout

    if (!response.ok) {
      const statusText = response.statusText || 'Unknown error';
      let errorMessage = `Moodle server error: ${response.status}`;
      
      // Provide helpful messages for common errors
      if (response.status === 520 || response.status === 522) {
        errorMessage = 'Moodle server is temporarily unavailable (Cloudflare error). Please try again.';
      } else if (response.status === 524) {
        errorMessage = 'Moodle server timeout. The request took too long. Try filtering data or requesting smaller pages.';
      } else if (response.status === 503) {
        errorMessage = 'Moodle server is down for maintenance. Please try again later.';
      }

      return NextResponse.json(
        { error: errorMessage, status: response.status, statusText },
        { status: response.status >= 500 ? 503 : response.status }
      );
    }

    let data;
    try {
      data = await response.json();
      console.log('Moodle response:', data);
    } catch {
      const text = await response.text();
      console.error('Failed to parse JSON response:', text.substring(0, 500));
      return NextResponse.json(
        { 
          error: 'Moodle server returned invalid response (HTML instead of JSON). Check if web services are enabled.',
          details: text.substring(0, 200)
        },
        { status: 502 }
      );
    }

    // Check for Moodle API errors
    if (data.exception) {
      return NextResponse.json(
        { error: data.message || 'Moodle API Error', exception: data.exception },
        { status: 400 }
      );
    }

    // Return successful response
    return NextResponse.json(data);

  } catch (error) {
    console.error('Moodle API proxy error:', error);
    
    let errorMessage = 'Failed to connect to Moodle server';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout. The Moodle server took too long to respond.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Also support GET requests
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wstoken = searchParams.get('wstoken');
    const wsfunction = searchParams.get('wsfunction');

    if (!wstoken || !wsfunction) {
      return NextResponse.json(
        { error: 'Missing required parameters: wstoken and wsfunction' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_MOODLE_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Moodle base URL not configured' },
        { status: 500 }
      );
    }

    const url = `${baseUrl}?${searchParams.toString()}`;

    // Use retry logic for GET requests too
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }, 3, 60000); // 3 retries, 60 second timeout

    if (!response.ok) {
      const statusText = response.statusText || 'Unknown error';
      let errorMessage = `Moodle server error: ${response.status}`;
      
      if (response.status === 520 || response.status === 522) {
        errorMessage = 'Moodle server is temporarily unavailable (Cloudflare error). Please try again.';
      } else if (response.status === 524) {
        errorMessage = 'Moodle server timeout. The request took too long.';
      } else if (response.status === 503) {
        errorMessage = 'Moodle server is down for maintenance. Please try again later.';
      }

      return NextResponse.json(
        { error: errorMessage, status: response.status, statusText },
        { status: response.status >= 500 ? 503 : response.status }
      );
    }

    const data = await response.json();

    if (data.exception) {
      return NextResponse.json(
        { error: data.message || 'Moodle API Error', exception: data.exception },
        { status: 400 }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Moodle API proxy error:', error);
    
    let errorMessage = 'Failed to connect to Moodle server';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout. The Moodle server took too long to respond.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
