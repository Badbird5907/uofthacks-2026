"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseAudioLevelOptions {
	smoothingFactor?: number; // 0-1, higher = smoother but slower response
	minDecibels?: number;
	maxDecibels?: number;
}

interface UseAudioLevelReturn {
	level: number; // 0-100
	isActive: boolean;
	startMonitoring: (stream: MediaStream) => void;
	stopMonitoring: () => void;
}

export function useAudioLevel(
	options: UseAudioLevelOptions = {}
): UseAudioLevelReturn {
	const { smoothingFactor = 0.3, minDecibels = -90, maxDecibels = -10 } = options;

	const [level, setLevel] = useState(0);
	const [isActive, setIsActive] = useState(false);

	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const dataArrayRef = useRef<Uint8Array | null>(null);

	const stopMonitoring = useCallback(() => {
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}

		if (sourceRef.current) {
			sourceRef.current.disconnect();
			sourceRef.current = null;
		}

		if (analyserRef.current) {
			analyserRef.current.disconnect();
			analyserRef.current = null;
		}

		if (audioContextRef.current && audioContextRef.current.state !== "closed") {
			audioContextRef.current.close();
			audioContextRef.current = null;
		}

		setIsActive(false);
		setLevel(0);
	}, []);

	const startMonitoring = useCallback(
		(stream: MediaStream) => {
			// Stop any existing monitoring
			stopMonitoring();

			try {
				// Create audio context
				const audioContext = new AudioContext();
				audioContextRef.current = audioContext;

				// Create analyser node
				const analyser = audioContext.createAnalyser();
				analyser.fftSize = 256;
				analyser.minDecibels = minDecibels;
				analyser.maxDecibels = maxDecibels;
				analyser.smoothingTimeConstant = smoothingFactor;
				analyserRef.current = analyser;

				// Create source from stream
				const source = audioContext.createMediaStreamSource(stream);
				sourceRef.current = source;

				// Connect source to analyser
				source.connect(analyser);

				// Create data array for frequency data
				const bufferLength = analyser.frequencyBinCount;
				const dataArray = new Uint8Array(bufferLength);
				dataArrayRef.current = dataArray;

				setIsActive(true);

				// Animation loop to read audio levels
				const updateLevel = () => {
					if (!analyserRef.current || !dataArrayRef.current) {
						return;
					}

					analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);

					// Calculate average level
					let sum = 0;
					for (let i = 0; i < dataArrayRef.current.length; i++) {
						sum += dataArrayRef.current[i] ?? 0;
					}
					const average = sum / dataArrayRef.current.length;

					// Convert to 0-100 scale
					const normalizedLevel = Math.min(100, Math.round((average / 255) * 100 * 2));
					setLevel(normalizedLevel);

					animationFrameRef.current = requestAnimationFrame(updateLevel);
				};

				updateLevel();
			} catch (err) {
				console.error("Failed to start audio monitoring:", err);
				stopMonitoring();
			}
		},
		[stopMonitoring, smoothingFactor, minDecibels, maxDecibels]
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopMonitoring();
		};
	}, [stopMonitoring]);

	return {
		level,
		isActive,
		startMonitoring,
		stopMonitoring,
	};
}
