"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DeviceStatus = "idle" | "requesting" | "granted" | "denied" | "error";

interface UseMediaDevicesOptions {
	autoStart?: boolean;
}

interface UseMediaDevicesReturn {
	// Streams
	cameraStream: MediaStream | null;
	microphoneStream: MediaStream | null;

	// Device lists
	cameras: MediaDeviceInfo[];
	microphones: MediaDeviceInfo[];

	// Selected devices
	selectedCameraId: string;
	selectedMicrophoneId: string;

	// Status
	cameraStatus: DeviceStatus;
	microphoneStatus: DeviceStatus;
	error: string | null;

	// Actions
	requestPermissions: () => Promise<void>;
	selectCamera: (deviceId: string) => Promise<void>;
	selectMicrophone: (deviceId: string) => Promise<void>;
	toggleCamera: () => void;
	toggleMicrophone: () => void;
	stopAllStreams: () => void;

	// State
	isCameraOn: boolean;
	isMicrophoneOn: boolean;
	isReady: boolean;
}

export function useMediaDevices(
	options: UseMediaDevicesOptions = {}
): UseMediaDevicesReturn {
	const { autoStart = true } = options;

	// Streams
	const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
	const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);

	// Device lists
	const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
	const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);

	// Selected devices
	const [selectedCameraId, setSelectedCameraId] = useState<string>("");
	const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>("");

	// Status
	const [cameraStatus, setCameraStatus] = useState<DeviceStatus>("idle");
	const [microphoneStatus, setMicrophoneStatus] = useState<DeviceStatus>("idle");
	const [error, setError] = useState<string | null>(null);

	// Toggle states
	const [isCameraOn, setIsCameraOn] = useState(true);
	const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);

	// Refs for cleanup
	const cameraStreamRef = useRef<MediaStream | null>(null);
	const microphoneStreamRef = useRef<MediaStream | null>(null);

	// Enumerate available devices
	const enumerateDevices = useCallback(async () => {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter((d) => d.kind === "videoinput");
			const audioDevices = devices.filter((d) => d.kind === "audioinput");

			setCameras(videoDevices);
			setMicrophones(audioDevices);

			// Set default selections if not already set
			if (!selectedCameraId && videoDevices.length > 0 && videoDevices[0]) {
				setSelectedCameraId(videoDevices[0].deviceId);
			}
			if (!selectedMicrophoneId && audioDevices.length > 0 && audioDevices[0]) {
				setSelectedMicrophoneId(audioDevices[0].deviceId);
			}

			return { videoDevices, audioDevices };
		} catch (err) {
			console.error("Failed to enumerate devices:", err);
			return { videoDevices: [], audioDevices: [] };
		}
	}, [selectedCameraId, selectedMicrophoneId]);

	// Stop a specific stream
	const stopStream = useCallback((stream: MediaStream | null) => {
		if (stream) {
			for (const track of stream.getTracks()) {
				track.stop();
			}
		}
	}, []);

	// Stop all streams
	const stopAllStreams = useCallback(() => {
		stopStream(cameraStreamRef.current);
		stopStream(microphoneStreamRef.current);
		cameraStreamRef.current = null;
		microphoneStreamRef.current = null;
		setCameraStream(null);
		setMicrophoneStream(null);
	}, [stopStream]);

	// Request camera stream
	const requestCamera = useCallback(
		async (deviceId?: string) => {
			setCameraStatus("requesting");
			setError(null);

			try {
				// Stop existing camera stream
				stopStream(cameraStreamRef.current);

				const constraints: MediaStreamConstraints = {
					video: deviceId
						? { deviceId: { exact: deviceId } }
						: { facingMode: "user" },
				};

				const stream = await navigator.mediaDevices.getUserMedia(constraints);
				cameraStreamRef.current = stream;
				setCameraStream(stream);
				setCameraStatus("granted");

				// Update selected device ID from the track
				const videoTrack = stream.getVideoTracks()[0];
				if (videoTrack) {
					const settings = videoTrack.getSettings();
					if (settings.deviceId) {
						setSelectedCameraId(settings.deviceId);
					}
				}

				return stream;
			} catch (err) {
				const error = err as Error;
				if (
					error.name === "NotAllowedError" ||
					error.name === "PermissionDeniedError"
				) {
					setCameraStatus("denied");
					setError("Camera permission denied. Please allow camera access.");
				} else if (error.name === "NotFoundError") {
					setCameraStatus("error");
					setError("No camera found. Please connect a camera.");
				} else {
					setCameraStatus("error");
					setError(`Camera error: ${error.message}`);
				}
				return null;
			}
		},
		[stopStream]
	);

	// Request microphone stream
	const requestMicrophone = useCallback(
		async (deviceId?: string) => {
			setMicrophoneStatus("requesting");
			setError(null);

			try {
				// Stop existing microphone stream
				stopStream(microphoneStreamRef.current);

				const constraints: MediaStreamConstraints = {
					audio: deviceId ? { deviceId: { exact: deviceId } } : true,
				};

				const stream = await navigator.mediaDevices.getUserMedia(constraints);
				microphoneStreamRef.current = stream;
				setMicrophoneStream(stream);
				setMicrophoneStatus("granted");

				// Update selected device ID from the track
				const audioTrack = stream.getAudioTracks()[0];
				if (audioTrack) {
					const settings = audioTrack.getSettings();
					if (settings.deviceId) {
						setSelectedMicrophoneId(settings.deviceId);
					}
				}

				return stream;
			} catch (err) {
				const error = err as Error;
				if (
					error.name === "NotAllowedError" ||
					error.name === "PermissionDeniedError"
				) {
					setMicrophoneStatus("denied");
					setError("Microphone permission denied. Please allow microphone access.");
				} else if (error.name === "NotFoundError") {
					setMicrophoneStatus("error");
					setError("No microphone found. Please connect a microphone.");
				} else {
					setMicrophoneStatus("error");
					setError(`Microphone error: ${error.message}`);
				}
				return null;
			}
		},
		[stopStream]
	);

	// Request all permissions
	const requestPermissions = useCallback(async () => {
		await Promise.all([requestCamera(), requestMicrophone()]);
		await enumerateDevices();
	}, [requestCamera, requestMicrophone, enumerateDevices]);

	// Select camera
	const selectCamera = useCallback(
		async (deviceId: string) => {
			setSelectedCameraId(deviceId);
			if (cameraStatus === "granted") {
				await requestCamera(deviceId);
			}
		},
		[cameraStatus, requestCamera]
	);

	// Select microphone
	const selectMicrophone = useCallback(
		async (deviceId: string) => {
			setSelectedMicrophoneId(deviceId);
			if (microphoneStatus === "granted") {
				await requestMicrophone(deviceId);
			}
		},
		[microphoneStatus, requestMicrophone]
	);

	// Toggle camera on/off
	const toggleCamera = useCallback(() => {
		if (cameraStream) {
			const videoTrack = cameraStream.getVideoTracks()[0];
			if (videoTrack) {
				videoTrack.enabled = !videoTrack.enabled;
				setIsCameraOn(videoTrack.enabled);
			}
		}
	}, [cameraStream]);

	// Toggle microphone on/off
	const toggleMicrophone = useCallback(() => {
		if (microphoneStream) {
			const audioTrack = microphoneStream.getAudioTracks()[0];
			if (audioTrack) {
				audioTrack.enabled = !audioTrack.enabled;
				setIsMicrophoneOn(audioTrack.enabled);
			}
		}
	}, [microphoneStream]);

	// Auto-start on mount
	useEffect(() => {
		if (autoStart) {
			requestPermissions();
		}

		return () => {
			stopAllStreams();
		};
	}, []);

	// Listen for device changes
	useEffect(() => {
		const handleDeviceChange = () => {
			enumerateDevices();
		};

		navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
		return () => {
			navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
		};
	}, [enumerateDevices]);

	// Compute ready state
	const isReady = cameraStatus === "granted" && microphoneStatus === "granted";

	return {
		cameraStream,
		microphoneStream,
		cameras,
		microphones,
		selectedCameraId,
		selectedMicrophoneId,
		cameraStatus,
		microphoneStatus,
		error,
		requestPermissions,
		selectCamera,
		selectMicrophone,
		toggleCamera,
		toggleMicrophone,
		stopAllStreams,
		isCameraOn,
		isMicrophoneOn,
		isReady,
	};
}
