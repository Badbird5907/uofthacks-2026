/**
 * Gemini Live API WebSocket Client
 * 
 * Handles real-time bidirectional communication with Gemini's Live API
 * for streaming audio and video inputs and receiving audio responses.
 */

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface GeminiLiveConfig {
  /** Direct WebSocket URL (if known) */
  wsUrl?: string;
  /** Model to use */
  model?: string;
  /** System instruction for the AI */
  systemInstruction?: string;
}

export interface LogEntry {
  timestamp: Date;
  type: 'info' | 'sent' | 'received' | 'error';
  message: string;
  data?: unknown;
}

type EventCallback = (...args: unknown[]) => void;

// Audio format constants
const AUDIO_SAMPLE_RATE = 24000; // Gemini expects 24kHz for output

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private wsUrl: string | null = null;
  private model: string;
  private systemInstruction: string;
  private connectionState: ConnectionState = 'disconnected';
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private logs: LogEntry[] = [];

  constructor(config: GeminiLiveConfig = {}) {
    this.wsUrl = config.wsUrl || null;
    this.model = config.model || 'gemini-2.0-flash-exp';
    this.systemInstruction = config.systemInstruction || 
      'You are a helpful AI assistant engaged in a real-time video and audio conversation. ' +
      'Respond naturally and conversationally. Keep responses concise but helpful. ' +
      'You can see what the user shows you through their camera and hear them speaking.';
  }

  private log(type: LogEntry['type'], message: string, data?: unknown) {
    const entry: LogEntry = { timestamp: new Date(), type, message, data };
    this.logs.push(entry);
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
    this.emit('log', entry);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.emit('logsCleared');
  }

  private emit(event: string, ...args: unknown[]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }

  on(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: ConnectionState) {
    this.connectionState = state;
    this.emit('connectionStateChange', state);
    this.log('info', `Connection state: ${state}`);
  }

  /**
   * Fetch WebSocket URL from server API
   */
  private async fetchConnectionConfig(): Promise<{ wsUrl: string; model: string }> {
    this.log('info', 'Fetching connection config from server...');
    
    const response = await fetch('/api/gemini-live/config');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get connection config');
    }
    
    const config = await response.json();
    return config;
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.log('info', 'Already connected');
      return;
    }

    this.setConnectionState('connecting');

    return new Promise(async (resolve, reject) => {
      try {
        // Get WebSocket URL from server if not provided
        let wsUrl = this.wsUrl;
        
        if (!wsUrl) {
          const config = await this.fetchConnectionConfig();
          wsUrl = config.wsUrl;
          if (config.model) {
            this.model = config.model;
          }
        }
        
        this.log('info', 'Connecting to Gemini Live API...');
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.log('info', 'WebSocket connected, sending setup message...');
          this.sendSetupMessage();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data, resolve);
        };

        this.ws.onerror = (error) => {
          this.log('error', 'WebSocket error', error);
          this.setConnectionState('error');
          reject(error);
        };

        this.ws.onclose = (event) => {
          this.log('info', `WebSocket closed: ${event.code} ${event.reason}`);
          this.setConnectionState('disconnected');
          this.emit('disconnected');
        };

      } catch (error) {
        this.log('error', 'Failed to connect', error);
        this.setConnectionState('error');
        reject(error);
      }
    });
  }

  private sendSetupMessage() {
    const setupMessage = {
      setup: {
        model: `models/${this.model}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Aoede'
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: this.systemInstruction }]
        }
      }
    };

    this.send(setupMessage);
    this.log('sent', 'Setup message sent', setupMessage);
  }

  private handleMessage(data: string | Blob, resolveConnect?: (value: void) => void) {
    try {
      // Handle Blob data
      if (data instanceof Blob) {
        data.text().then(text => this.processMessage(text, resolveConnect));
        return;
      }
      
      this.processMessage(data, resolveConnect);
    } catch (error) {
      this.log('error', 'Failed to handle message', error);
    }
  }

  private processMessage(data: string, resolveConnect?: (value: void) => void) {
    try {
      const message = JSON.parse(data);
      
      // Handle setup complete
      if (message.setupComplete) {
        this.log('received', 'Setup complete');
        this.setConnectionState('connected');
        this.emit('setupComplete');
        if (resolveConnect) resolveConnect();
        return;
      }

      // Handle server content (audio response)
      if (message.serverContent) {
        this.handleServerContent(message.serverContent);
        return;
      }

      // Handle tool calls
      if (message.toolCall) {
        this.log('received', 'Tool call received', message.toolCall);
        this.emit('toolCall', message.toolCall);
        return;
      }

      // Log other messages
      this.log('received', 'Message received', message);
      
    } catch (error) {
      this.log('error', 'Failed to parse message', { data, error });
    }
  }

  private handleServerContent(serverContent: {
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    turnComplete?: boolean;
    interrupted?: boolean;
  }) {
    // Handle model turn with audio/text
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.inlineData) {
          // Audio data
          const { mimeType, data } = part.inlineData;
          if (mimeType.startsWith('audio/')) {
            this.log('received', `Audio chunk: ${data.length} bytes`);
            this.emit('audioData', {
              mimeType,
              data,
              sampleRate: AUDIO_SAMPLE_RATE
            });
          }
        } else if (part.text) {
          // Text response
          this.log('received', `Text: ${part.text}`);
          this.emit('text', part.text);
        }
      }
    }

    // Handle turn completion
    if (serverContent.turnComplete) {
      this.log('received', 'Turn complete');
      this.emit('turnComplete');
    }

    // Handle interruption
    if (serverContent.interrupted) {
      this.log('received', 'Response interrupted');
      this.emit('interrupted');
    }
  }

  private send(data: object) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('error', 'Cannot send: WebSocket not connected');
      return;
    }
    this.ws.send(JSON.stringify(data));
  }

  /**
   * Send audio data to Gemini
   * @param audioData Base64-encoded PCM16 audio at 16kHz
   */
  sendAudio(audioData: string) {
    if (this.connectionState !== 'connected') return;

    const message = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm;rate=16000',
          data: audioData
        }]
      }
    };

    this.send(message);
    // Don't log every audio chunk to reduce noise
  }

  /**
   * Send video frame to Gemini
   * @param imageData Base64-encoded JPEG image
   */
  sendVideo(imageData: string) {
    if (this.connectionState !== 'connected') return;

    const message = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'image/jpeg',
          data: imageData
        }]
      }
    };

    this.send(message);
    // Don't log every video frame to reduce noise
  }

  /**
   * Send text message to Gemini
   * @param text Text message
   */
  sendText(text: string) {
    if (this.connectionState !== 'connected') return;

    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turnComplete: true
      }
    };

    this.send(message);
    this.log('sent', `Text: ${text}`);
  }

  disconnect() {
    if (this.ws) {
      this.log('info', 'Disconnecting...');
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionState('disconnected');
  }
}
