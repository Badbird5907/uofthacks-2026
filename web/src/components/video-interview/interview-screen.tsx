import { useState, useEffect, useRef, useCallback } from "react";
import type { ConnectionState, LogEntry } from "@/lib/gemini-live-client";
import { GeminiLiveClient } from "@/lib/gemini-live-client";
import { MediaCapture } from "@/lib/media-capture";
import { AudioPlayback } from "@/lib/audio-playback";

export function InterviewScreen({ jobId, jobTitle, companyName, onInterviewComplete }: { jobId: string, jobTitle: string, companyName: string, onInterviewComplete: (videoBlob: Blob | null) => void }) {
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

  // Recording state
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const recordedBlobRef = useRef<Blob | null>(null);
 
   // Refs
   const videoRef = useRef<HTMLVideoElement>(null);
   const clientRef = useRef<GeminiLiveClient | null>(null);
   const mediaCaptureRef = useRef<MediaCapture | null>(null);
   const audioPlaybackRef = useRef<AudioPlayback | null>(null);
   const animationFrameRef = useRef<number | null>(null);

   // Recording refs
   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
   const recordedChunksRef = useRef<Blob[]>([]);
   const mediaStreamRef = useRef<MediaStream | null>(null);
   const recordingAudioContextRef = useRef<AudioContext | null>(null);
   const combinedStreamRef = useRef<MediaStream | null>(null);
 
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
       
       // Cleanup recording
       if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
         mediaRecorderRef.current.stop();
       }
       if (recordingAudioContextRef.current) {
         recordingAudioContextRef.current.close();
       }
       if (recordedVideoUrl) {
         URL.revokeObjectURL(recordedVideoUrl);
       }
     };
   }, [recordedVideoUrl]);
 
 
   const startCall = async () => {
     setError(null);
 
     try {
       // Initialize Gemini client (will fetch config from server API)
       const client = new GeminiLiveClient({ model: "gemini-2.5-flash-native-audio-preview-12-2025" });
       clientRef.current = client;
 
       // Set up event listeners
       client.on('connectionStateChange', (state: unknown) => {
         setConnectionState(state as ConnectionState);
       });
 
       client.on('log', (entry: unknown) => {
        console.log("[LOG]", entry);
       });
 
       client.on('audioData', (data: unknown) => {
         const audioData = data as { data: string };
         audioPlaybackRef.current?.addToQueue(audioData.data);
       });
 
       client.on('text', (text: unknown) => {
         console.log("[TEXT]", text);
       });
 
       // Initialize audio playback
       const audioPlayback = new AudioPlayback({
         onPlaybackStart: () => setIsAiSpeaking(true),
         onPlaybackEnd: () => setIsAiSpeaking(false),
         onError: (err) => console.error("[ERROR]", err)
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
          // Video frame captured but not sent to model - only displayed to user
        },
        onError: (err) => {
          setError(`Media capture error: ${err.message}`);
        }
      });
 
       const { videoElement } = await mediaCapture.initialize();
       mediaCaptureRef.current = mediaCapture;
 
       // Get the media stream for recording
       const stream = videoElement.srcObject as MediaStream;
       mediaStreamRef.current = stream;

       // Attach video to preview element
       if (videoRef.current) {
         videoRef.current.srcObject = stream;
         await videoRef.current.play();
       }

       // Initialize MediaRecorder for recording the interview
       recordedChunksRef.current = [];
       
       // Create a combined stream that includes:
       // 1. Video from webcam
       // 2. Mixed audio from user's microphone + AI's audio output
       
       // Get the AI audio stream
       const aiAudioStream = audioPlayback.getAudioStream();
       
       // Create an AudioContext for mixing audio streams
       const recordingAudioContext = new AudioContext();
       recordingAudioContextRef.current = recordingAudioContext;
       
       // Create a destination for the mixed audio
       const mixedAudioDestination = recordingAudioContext.createMediaStreamDestination();
       
       // Connect user's microphone audio to the mixer
       const userAudioTrack = stream.getAudioTracks()[0];
       if (userAudioTrack) {
         const userAudioStream = new MediaStream([userAudioTrack]);
         const userAudioSource = recordingAudioContext.createMediaStreamSource(userAudioStream);
         userAudioSource.connect(mixedAudioDestination);
       }
       
       // Connect AI audio to the mixer (if available)
       if (aiAudioStream) {
         const aiAudioSource = recordingAudioContext.createMediaStreamSource(aiAudioStream);
         aiAudioSource.connect(mixedAudioDestination);
         console.log("[INFO] AI audio connected to recording mixer");
       }
       
       // Create combined stream with video track + mixed audio track
       const videoTrack = stream.getVideoTracks()[0];
       const mixedAudioTrack = mixedAudioDestination.stream.getAudioTracks()[0];
       
       const combinedStream = new MediaStream();
       if (videoTrack) {
         combinedStream.addTrack(videoTrack);
       }
       if (mixedAudioTrack) {
         combinedStream.addTrack(mixedAudioTrack);
       }
       combinedStreamRef.current = combinedStream;
       
       // Determine the best supported mime type
       const mimeTypes = [
         'video/webm;codecs=vp9,opus',
         'video/webm;codecs=vp8,opus',
         'video/webm',
         'video/mp4',
       ];
       
       let selectedMimeType = '';
       for (const mimeType of mimeTypes) {
         if (MediaRecorder.isTypeSupported(mimeType)) {
           selectedMimeType = mimeType;
           break;
         }
       }

       if (selectedMimeType) {
         // Use the combined stream (video + mixed audio) for recording
         const mediaRecorder = new MediaRecorder(combinedStream, {
           mimeType: selectedMimeType,
           videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
         });

         mediaRecorder.ondataavailable = (event) => {
           if (event.data && event.data.size > 0) {
             recordedChunksRef.current.push(event.data);
           }
         };

         mediaRecorder.onerror = (event) => {
           console.error("[RECORDING ERROR]", event);
         };

         mediaRecorderRef.current = mediaRecorder;
         
         // Start recording with timeslice to get data in chunks
         mediaRecorder.start(1000); // Collect data every second
         console.log("[INFO] Recording started with mime type:", selectedMimeType);
         console.log("[INFO] Recording includes user video, user audio, and AI audio");
       } else {
         console.warn("[WARNING] No supported video recording format found");
       }
 
       // Connect to Gemini (fetches WebSocket URL from server)
       await client.connect();

       
       // Start streaming
       await mediaCapture.startCapture();
       setIsStreaming(true);
       
       console.log("[INFO] Call started - speak or show something to the camera!");
       client.sendText("Hello, I'm starting the interview. Please respond naturally and conversationally.")
 
     } catch (err) {
       const message = err instanceof Error ? err.message : 'Failed to start call';
       setError(message);
       setConnectionState('error');
     }
   };
 
  const endCall = () => {
    setIsProcessingRecording(true);

    // Stop recording first and process the video
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        // Create a blob from all recorded chunks
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        
        if (blob.size > 0) {
          // Create a URL for the recorded video
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
          recordedBlobRef.current = blob;
          console.log("[INFO] Recording saved, size:", (blob.size / 1024 / 1024).toFixed(2), "MB");
        }

        setIsProcessingRecording(false);
        setIsInterviewComplete(true);
        
        // Cleanup refs
        mediaRecorderRef.current = null;
        recordedChunksRef.current = [];
      };

      mediaRecorderRef.current.stop();
    } else {
      setIsProcessingRecording(false);
      setIsInterviewComplete(true);
    }

    // Stop other services
    clientRef.current?.disconnect();
    mediaCaptureRef.current?.cleanup();
    audioPlaybackRef.current?.cleanup();
    
    // Cleanup recording audio context
    if (recordingAudioContextRef.current) {
      recordingAudioContextRef.current.close();
      recordingAudioContextRef.current = null;
    }

    clientRef.current = null;
    mediaCaptureRef.current = null;
    audioPlaybackRef.current = null;
    mediaStreamRef.current = null;
    combinedStreamRef.current = null;

    setIsStreaming(false);
    setConnectionState('disconnected');
    setIsAiSpeaking(false);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    console.log("Call ended");
  };

  const downloadRecording = () => {
    if (!recordedVideoUrl) return;

    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `interview-${jobId}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const finishInterview = () => {
    // Get the blob before cleanup
    const blob = recordedBlobRef.current;
    
    // Cleanup the blob URL
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    
    // Call the completion callback to notify parent component with the blob
    onInterviewComplete(blob);
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
 
   const getStatusColor = () => {
     switch (connectionState) {
       case 'connected': return 'bg-green-500';
       case 'connecting': return 'bg-yellow-500 animate-pulse';
       case 'error': return 'bg-red-500';
       default: return 'bg-gray-500';
     }
   };
 
   // Interview complete screen
   if (isInterviewComplete) {
     return (
       <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 flex items-center justify-center">
         <div className="max-w-lg mx-auto text-center space-y-8">
           {/* Success icon */}
           <div className="w-20 h-20 mx-auto bg-green-600 rounded-full flex items-center justify-center">
             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
             </svg>
           </div>

           <div className="space-y-2">
             <h1 className="text-3xl font-bold">Interview Complete!</h1>
             <p className="text-zinc-400">
               Thank you for completing the interview for {jobTitle} at {companyName}.
             </p>
           </div>

           {/* Recording info */}
           {recordedVideoUrl && (
             <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
               <div className="flex items-center justify-center gap-2 text-zinc-300">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                 </svg>
                 <span>Your interview was recorded</span>
               </div>

               <p className="text-sm text-zinc-500">
                 You can download your recording to review or save it for your records.
               </p>

               <button
                 onClick={downloadRecording}
                 className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                 </svg>
                 Download Recording
               </button>
             </div>
           )}

           {!recordedVideoUrl && (
             <div className="bg-zinc-900 rounded-xl p-6">
               <p className="text-zinc-400">No recording available.</p>
             </div>
           )}

           {/* Continue button */}
           <button
             onClick={finishInterview}
             className="w-full px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold transition-colors"
           >
             Continue
           </button>
         </div>
       </div>
     );
   }

   // Processing recording screen
   if (isProcessingRecording) {
     return (
       <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 flex items-center justify-center">
         <div className="text-center space-y-4">
           <div className="w-12 h-12 mx-auto border-4 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
           <p className="text-zinc-400">Processing your recording...</p>
         </div>
       </div>
     );
   }

   return (
     <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-0 md:px-8 md:pb-8 md:pt-4">
       <div className="max-w-6xl mx-auto">
         {/* Header */}
         <div className="flex items-center justify-between mb-6">
           <div>
             <h1 className="text-2xl font-bold">{jobTitle} Interview</h1>
             <p className="text-zinc-400 text-sm">{companyName}</p>
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
 
        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Video Section */}
          <div className="space-y-4">
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
 
               {/* Recording indicator */}
               {isStreaming && (
                 <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                   <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                   REC
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
          </div>
       </div>
     </div>
   );
}