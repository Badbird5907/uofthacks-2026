/**
 * Gemini Live API Configuration Endpoint
 * 
 * Returns the WebSocket URL with API key for client connection.
 * In production, you'd want to add authentication and rate limiting.
 */

import { NextResponse } from 'next/server';

const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured on server' },
      { status: 500 }
    );
  }

  // Return the full WebSocket URL with API key
  // The client will use this to connect directly to Gemini
  // This keeps the API key out of the client-side code
  return NextResponse.json({
    wsUrl: `${GEMINI_WS_URL}?key=${apiKey}`,
    model: 'gemini-2.0-flash-exp'
  });
}
