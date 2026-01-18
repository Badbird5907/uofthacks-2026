'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiLiveClient } from '@/lib/gemini-live-client';
import type { ConnectionState, LogEntry } from '@/lib/gemini-live-client';
import { MediaCapture } from '@/lib/media-capture';
import { AudioPlayback } from '@/lib/audio-playback';

export default function Home() {
  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Media state
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);

  // Audio visualization
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const mediaCaptureRef = useRef<MediaCapture | null>(null);
  const audioPlaybackRef = useRef<AudioPlayback | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Animation loop for audio visualization
  const updateAudioLevels = useCallback(() => {
    if (mediaCaptureRef.current && mediaCaptureRef.current.getIsCapturing()) {
      // For input, we'll just show a visual indicator when mic is on
      setInputLevel(isMicOn ? 0.3 + Math.random() * 0.3 : 0);
    } else {
      setInputLevel(0);
    }

    if (audioPlaybackRef.current) {
      const level = audioPlaybackRef.current.getAudioLevel();
      setOutputLevel(level);
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  }, [isMicOn]);

  // Start/stop animation loop
  useEffect(() => {
    if (isStreaming) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isStreaming, updateAudioLevels]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
      mediaCaptureRef.current?.cleanup();
      audioPlaybackRef.current?.cleanup();
    };
  }, []);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [...prev.slice(-99), entry]);
  }, []);

  const startCall = async () => {
    setError(null);

    try {
      // Initialize Gemini client (will fetch config from server API)
      const client = new GeminiLiveClient({ model: "gemini-2.5-flash-native-audio-preview-12-2025"});
      clientRef.current = client;

      // Set up event listeners
      client.on('connectionStateChange', (state: unknown) => {
        setConnectionState(state as ConnectionState);
      });

      client.on('log', (entry: unknown) => {
        addLog(entry as LogEntry);
      });

      client.on('audioData', (data: unknown) => {
        const audioData = data as { data: string };
        audioPlaybackRef.current?.addToQueue(audioData.data);
      });

      client.on('text', (text: unknown) => {
        addLog({
          timestamp: new Date(),
          type: 'received',
          message: `Gemini: ${text as string}`
        });
      });

      // Initialize audio playback
      const audioPlayback = new AudioPlayback({
        onPlaybackStart: () => setIsAiSpeaking(true),
        onPlaybackEnd: () => setIsAiSpeaking(false),
        onError: (err) => addLog({
          timestamp: new Date(),
          type: 'error',
          message: `Audio playback error: ${err.message}`
        })
      });
      await audioPlayback.initialize();
      audioPlaybackRef.current = audioPlayback;

      // Initialize media capture
      const mediaCapture = new MediaCapture({
        videoFps: 12,
        onAudioData: (data) => {
          client.sendAudio(data);
        },
        onVideoFrame: (data) => {
          client.sendVideo(data);
        },
        onError: (err) => {
          setError(`Media capture error: ${err.message}`);
        }
      });

      const { videoElement } = await mediaCapture.initialize();
      mediaCaptureRef.current = mediaCapture;

      // Attach video to preview element
      if (videoRef.current) {
        videoRef.current.srcObject = videoElement.srcObject;
        await videoRef.current.play();
      }

      // Connect to Gemini (fetches WebSocket URL from server)
      await client.connect();

      // Start streaming
      await mediaCapture.startCapture();
      setIsStreaming(true);

      addLog({
        timestamp: new Date(),
        type: 'info',
        message: 'Call started - speak or show something to the camera!'
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start call';
      setError(message);
      setConnectionState('error');
    }
  };

  const endCall = () => {
    clientRef.current?.disconnect();
    mediaCaptureRef.current?.cleanup();
    audioPlaybackRef.current?.cleanup();

    clientRef.current = null;
    mediaCaptureRef.current = null;
    audioPlaybackRef.current = null;

    setIsStreaming(false);
    setConnectionState('disconnected');
    setIsAiSpeaking(false);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    addLog({
      timestamp: new Date(),
      type: 'info',
      message: 'Call ended'
    });
  };

  const toggleCamera = () => {
    const newState = !isCameraOn;
    setIsCameraOn(newState);
    mediaCaptureRef.current?.setCamera(newState);
  };

  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    mediaCaptureRef.current?.setMicrophone(newState);
  };

  const clearLogs = () => {
    setLogs([]);
    clientRef.current?.clearLogs();
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'sent': return 'text-blue-400';
      case 'received': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gemini Live</h1>
            <p className="text-zinc-400 text-sm">Video + Audio Call with AI</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="text-sm capitalize">{connectionState}</span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
            {error.includes('API key') && (
              <p className="text-red-300 mt-2 text-sm">
                Make sure <code className="bg-red-800 px-1 rounded">GEMINI_API_KEY</code> is set in your <code className="bg-red-800 px-1 rounded">.env.local</code> file (without the NEXT_PUBLIC_ prefix for server-side use).
              </p>
            )}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Feed */}
            <div className="relative bg-zinc-900 rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
              />
              
              {/* Camera off placeholder */}
              {!isCameraOn && isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-zinc-500 mt-2">Camera Off</p>
                  </div>
                </div>
              )}

              {/* Not connected placeholder */}
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-zinc-500 mt-2">Click &quot;Start Call&quot; to begin</p>
                  </div>
                </div>
              )}

              {/* AI Speaking indicator */}
              {isAiSpeaking && (
                <div className="absolute top-4 right-4 bg-blue-600 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  AI Speaking
                </div>
              )}
            </div>

            {/* Audio Levels */}
            <div className="grid grid-cols-2 gap-4">
              {/* Input Level */}
              <div className="bg-zinc-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Your Audio</span>
                  <span className={`text-xs ${isMicOn ? 'text-green-400' : 'text-red-400'}`}>
                    {isMicOn ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-75"
                    style={{ width: `${inputLevel * 100}%` }}
                  />
                </div>
              </div>

              {/* Output Level */}
              <div className="bg-zinc-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Gemini Audio</span>
                  <span className={`text-xs ${isAiSpeaking ? 'text-blue-400' : 'text-zinc-500'}`}>
                    {isAiSpeaking ? 'SPEAKING' : 'IDLE'}
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-75"
                    style={{ width: `${outputLevel * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {/* Mic Toggle */}
              <button
                onClick={toggleMic}
                disabled={!isStreaming}
                className={`p-4 rounded-full transition-colors ${
                  isMicOn
                    ? 'bg-zinc-700 hover:bg-zinc-600'
                    : 'bg-red-600 hover:bg-red-500'
                } ${!isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isMicOn ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                )}
              </button>

              {/* Start/End Call */}
              {!isStreaming ? (
                <button
                  onClick={startCall}
                  disabled={connectionState === 'connecting'}
                  className={`px-8 py-4 rounded-full font-semibold transition-colors ${
                    connectionState === 'connecting'
                      ? 'bg-yellow-600 cursor-wait'
                      : 'bg-green-600 hover:bg-green-500'
                  }`}
                >
                  {connectionState === 'connecting' ? 'Connecting...' : 'Start Call'}
                </button>
              ) : (
                <button
                  onClick={endCall}
                  className="px-8 py-4 rounded-full bg-red-600 hover:bg-red-500 font-semibold transition-colors"
                >
                  End Call
                </button>
              )}

              {/* Camera Toggle */}
              <button
                onClick={toggleCamera}
                disabled={!isStreaming}
                className={`p-4 rounded-full transition-colors ${
                  isCameraOn
                    ? 'bg-zinc-700 hover:bg-zinc-600'
                    : 'bg-red-600 hover:bg-red-500'
                } ${!isStreaming ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isCameraOn ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Logs Section */}
          <div className="bg-zinc-900 rounded-xl overflow-hidden flex flex-col h-[600px]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="font-semibold">Event Log</h2>
              <button
                onClick={clearLogs}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">No events yet</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`${getLogColor(log.type)}`}>
                    <span className="text-zinc-600">
                      {log.timestamp.toLocaleTimeString()}
                    </span>{' '}
                    <span className={`uppercase text-[10px] ${getLogColor(log.type)}`}>
                      [{log.type}]
                    </span>{' '}
                    <span className="text-zinc-300">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="mt-8 bg-zinc-900 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Setup Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-400">
            <li>
              Get your API key from{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Google AI Studio
              </a>
            </li>
            <li>
              Create a <code className="bg-zinc-800 px-1 rounded">.env.local</code> file in the project root
            </li>
            <li>
              Add: <code className="bg-zinc-800 px-1 rounded">GEMINI_API_KEY=your_api_key_here</code>
            </li>
            <li>Restart the development server</li>
          </ol>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-zinc-500 text-sm">
          <p>
            Powered by{' '}
            <a
              href="https://ai.google.dev/api/live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Gemini Live API
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
