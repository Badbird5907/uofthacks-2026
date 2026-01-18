/**
 * Media Capture Utilities
 * 
 * Handles audio and video capture from user's microphone and camera,
 * including encoding for transmission to Gemini Live API.
 */

// Audio configuration
const AUDIO_SAMPLE_RATE = 16000; // Gemini expects 16kHz input
const AUDIO_CHANNELS = 1; // Mono

// Video configuration
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;
const VIDEO_QUALITY = 0.8;

export interface MediaCaptureConfig {
  onAudioData?: (base64Data: string) => void;
  onVideoFrame?: (base64Data: string) => void;
  onError?: (error: Error) => void;
  videoFps?: number;
}

export class MediaCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private videoInterval: ReturnType<typeof setInterval> | null = null;
  
  private config: MediaCaptureConfig;
  private isCapturing = false;
  private isCameraEnabled = true;
  private isMicEnabled = true;

  constructor(config: MediaCaptureConfig = {}) {
    this.config = {
      videoFps: 5,
      ...config
    };
  }

  /**
   * Request permissions and initialize media capture
   */
  async initialize(): Promise<{ videoElement: HTMLVideoElement }> {
    try {
      // Request both audio and video
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_SAMPLE_RATE,
          channelCount: AUDIO_CHANNELS,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: {
          width: { ideal: VIDEO_WIDTH },
          height: { ideal: VIDEO_HEIGHT },
          facingMode: 'user'
        }
      });

      // Set up video element for preview
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.mediaStream;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      await this.videoElement.play();

      // Set up canvas for frame capture
      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = VIDEO_WIDTH;
      this.canvasElement.height = VIDEO_HEIGHT;
      this.canvasContext = this.canvasElement.getContext('2d');

      return { videoElement: this.videoElement };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to initialize media capture');
      this.config.onError?.(err);
      throw err;
    }
  }

  /**
   * Start capturing and streaming audio/video
   */
  async startCapture(): Promise<void> {
    if (!this.mediaStream) {
      throw new Error('Media not initialized. Call initialize() first.');
    }

    if (this.isCapturing) {
      return;
    }

    this.isCapturing = true;

    // Start audio capture
    await this.startAudioCapture();

    // Start video capture
    this.startVideoCapture();
  }

  private async startAudioCapture() {
    if (!this.mediaStream) return;

    try {
      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
      
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Use ScriptProcessorNode (deprecated but widely supported)
      // Buffer size of 4096 gives ~256ms chunks at 16kHz
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isCapturing || !this.isMicEnabled) return;

        const inputData = event.inputBuffer.getChannelData(0);
        const pcm16Data = this.floatTo16BitPCM(inputData);
        const base64Data = this.arrayBufferToBase64(pcm16Data);
        
        this.config.onAudioData?.(base64Data);
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      this.config.onError?.(error instanceof Error ? error : new Error('Audio capture failed'));
    }
  }

  private startVideoCapture() {
    if (!this.videoElement || !this.canvasContext) return;

    const frameInterval = 1000 / (this.config.videoFps || 5);

    this.videoInterval = setInterval(() => {
      if (!this.isCapturing || !this.isCameraEnabled) return;
      if (!this.videoElement || !this.canvasContext || !this.canvasElement) return;

      // Draw current video frame to canvas
      this.canvasContext.drawImage(
        this.videoElement,
        0, 0,
        this.canvasElement.width,
        this.canvasElement.height
      );

      // Convert to JPEG and base64
      const dataUrl = this.canvasElement.toDataURL('image/jpeg', VIDEO_QUALITY);
      // Remove the data URL prefix to get just the base64 data
      const base64Data = dataUrl.split(',')[1];

      this.config.onVideoFrame?.(base64Data ?? '');
    }, frameInterval);
  }

  /**
   * Convert Float32Array audio to 16-bit PCM
   */
  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp value between -1 and 1
      const s = Math.max(-1, Math.min(1, float32Array[i] ?? 0));
      // Convert to 16-bit integer
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    
    return buffer;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    return btoa(binary);
  }

  /**
   * Toggle camera on/off
   */
  setCamera(enabled: boolean) {
    this.isCameraEnabled = enabled;
    
    if (this.mediaStream) {
      this.mediaStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle microphone on/off
   */
  setMicrophone(enabled: boolean) {
    this.isMicEnabled = enabled;
    
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Get audio levels for visualization (0-1 scale)
   */
  getAudioLevel(): number {
    if (!this.audioContext || !this.mediaStream) return 0;

    // Create analyser if not exists
    // Note: In a real app, you'd want to cache this
    const analyser = this.audioContext.createAnalyser();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const sum = dataArray.reduce((a, b) => a + b, 0);
    return sum / dataArray.length / 255;
  }

  /**
   * Stop all capture
   */
  stopCapture() {
    this.isCapturing = false;

    // Stop video capture
    if (this.videoInterval) {
      clearInterval(this.videoInterval);
      this.videoInterval = null;
    }

    // Stop audio capture
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.audioWorklet) {
      this.audioWorklet.disconnect();
      this.audioWorklet = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Clean up all resources
   */
  cleanup() {
    this.stopCapture();

    // Stop all tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Clean up video element
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    // Clean up canvas
    this.canvasElement = null;
    this.canvasContext = null;
  }

  /**
   * Check if currently capturing
   */
  getIsCapturing(): boolean {
    return this.isCapturing;
  }

  /**
   * Get camera enabled state
   */
  getIsCameraEnabled(): boolean {
    return this.isCameraEnabled;
  }

  /**
   * Get microphone enabled state
   */
  getIsMicEnabled(): boolean {
    return this.isMicEnabled;
  }
}
