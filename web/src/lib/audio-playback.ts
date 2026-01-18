/**
 * Audio Playback Utilities
 * 
 * Handles playback of audio responses from Gemini Live API,
 * including decoding base64 PCM audio and managing playback queue.
 */

export interface AudioPlaybackConfig {
  sampleRate?: number;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: Error) => void;
}

interface QueuedAudio {
  audioData: Float32Array;
  timestamp: number;
}

export class AudioPlayback {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private config: AudioPlaybackConfig;
  private audioQueue: QueuedAudio[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;
  private volume = 1.0;

  // For visualization
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  // For recording - captures AI audio as a MediaStream
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;

  constructor(config: AudioPlaybackConfig = {}) {
    this.config = {
      sampleRate: 24000, // Gemini outputs 24kHz audio
      ...config
    };
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    try {
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate
      });

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.audioContext.destination);

      // Create MediaStreamDestination for recording AI audio
      this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();
      this.gainNode.connect(this.mediaStreamDestination);

      // Create analyser for visualization
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.connect(this.gainNode);

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to initialize audio playback');
      this.config.onError?.(err);
      throw err;
    }
  }

  /**
   * Get the MediaStream containing AI audio for recording
   */
  getAudioStream(): MediaStream | null {
    return this.mediaStreamDestination?.stream ?? null;
  }

  /**
   * Add audio data to the playback queue
   * @param base64Data Base64-encoded PCM16 audio data
   */
  addToQueue(base64Data: string): void {
    if (!this.audioContext) {
      console.warn('Audio context not initialized');
      return;
    }

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to Float32
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = (pcm16[i] ?? 0) / 32768;
      }

      // Add to queue
      this.audioQueue.push({
        audioData: float32,
        timestamp: Date.now()
      });

      // Start playback if not already playing
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (error) {
      console.error('Failed to decode audio data:', error);
    }
  }

  private playNext(): void {
    if (!this.audioContext || !this.analyser || this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.config.onPlaybackEnd?.();
      return;
    }

    this.isPlaying = true;

    const { audioData } = this.audioQueue.shift()!;
    
    // Create audio buffer
    const audioBuffer = this.audioContext.createBuffer(
      1, // mono
      audioData.length,
      this.config.sampleRate!
    );
    audioBuffer.getChannelData(0).set(audioData);

    // Create buffer source
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser);

    // Calculate when to start this chunk
    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.nextPlayTime);
    
    // Schedule next chunk to start after this one ends
    this.nextPlayTime = startTime + audioBuffer.duration;

    // Handle when this chunk finishes
    source.onended = () => {
      // Check if there are more chunks to play
      if (this.audioQueue.length > 0) {
        this.playNext();
      } else {
        this.isPlaying = false;
        this.config.onPlaybackEnd?.();
      }
    };

    // Start playback
    source.start(startTime);

    if (!this.isPlaying) {
      this.config.onPlaybackStart?.();
    }
  }

  /**
   * Get audio levels for visualization (0-1 scale)
   */
  getAudioLevel(): number {
    if (!this.analyser || !this.dataArray) return 0;

    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
    
    // Calculate average volume
    const sum = this.dataArray.reduce((a, b) => a + b, 0);
    return sum / this.dataArray.length / 255;
  }

  /**
   * Get frequency data for detailed visualization
   */
  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray) return null;

    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
    return this.dataArray;
  }

  /**
   * Set playback volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Stop all playback and clear queue
   */
  stop(): void {
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
    
    // Note: We can't stop already-scheduled audio sources,
    // but clearing the queue prevents new chunks from playing
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.audioQueue.length;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.gainNode = null;
    this.analyser = null;
    this.dataArray = null;
    this.mediaStreamDestination = null;
  }
}
