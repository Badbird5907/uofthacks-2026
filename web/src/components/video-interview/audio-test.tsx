"use client";

import { Mic, MicOff, AlertCircle, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/hooks/use-media-devices";
import { useAudioLevel } from "@/hooks/use-audio-level";

interface AudioTestProps {
	stream: MediaStream | null;
	status: DeviceStatus;
	isOn: boolean;
	microphones: MediaDeviceInfo[];
	selectedMicrophoneId: string;
	onSelectMicrophone: (deviceId: string) => void;
	onToggle: () => void;
	onRetry: () => void;
	className?: string;
}

export function AudioTest({
	stream,
	status,
	isOn,
	microphones,
	selectedMicrophoneId,
	onSelectMicrophone,
	onToggle,
	onRetry,
	className,
}: AudioTestProps) {
	const { level, startMonitoring, stopMonitoring } = useAudioLevel();

	// Start/stop monitoring based on stream
	useEffect(() => {
		if (stream && status === "granted" && isOn) {
			startMonitoring(stream);
		} else {
			stopMonitoring();
		}

		return () => {
			stopMonitoring();
		};
	}, [stream, status, isOn, startMonitoring, stopMonitoring]);

	const renderStatusContent = () => {
		if (status === "requesting" || status === "idle") {
			return (
				<div className="flex items-center gap-2 text-muted-foreground">
					<div className="size-8 rounded-full bg-muted flex items-center justify-center animate-pulse">
						<Mic className="size-4" />
					</div>
					<span className="text-sm">Requesting microphone access...</span>
				</div>
			);
		}

		if (status === "denied") {
			return (
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-destructive">
						<div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center">
							<AlertCircle className="size-4" />
						</div>
						<div>
							<p className="text-sm font-medium">Microphone access denied</p>
							<p className="text-xs text-muted-foreground">
								Allow microphone access in browser settings
							</p>
						</div>
					</div>
					<Button variant="outline" size="sm" onClick={onRetry}>
						<RefreshCw className="size-3.5" />
						Retry
					</Button>
				</div>
			);
		}

		if (status === "error") {
			return (
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-destructive">
						<div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center">
							<MicOff className="size-4" />
						</div>
						<div>
							<p className="text-sm font-medium">Microphone not available</p>
							<p className="text-xs text-muted-foreground">
								Check your microphone connection
							</p>
						</div>
					</div>
					<Button variant="outline" size="sm" onClick={onRetry}>
						<RefreshCw className="size-3.5" />
						Retry
					</Button>
				</div>
			);
		}

		return null;
	};

	const statusContent = renderStatusContent();
	const showControls = status === "granted";

	// Determine level indicator color
	const getLevelColor = (lvl: number) => {
		if (lvl < 30) return "bg-green-500";
		if (lvl < 70) return "bg-yellow-500";
		return "bg-red-500";
	};

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			{statusContent ? (
				<div className="p-4 border border-border bg-muted/30">{statusContent}</div>
			) : (
				showControls && (
					<div className="p-4 border border-border bg-muted/30 space-y-4">
						{/* Microphone status and toggle */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Button
									variant={isOn ? "secondary" : "destructive"}
									size="icon"
									onClick={onToggle}
									className="rounded-full size-10"
								>
									{isOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
								</Button>
								<div>
									<p className="text-sm font-medium">
										{isOn ? "Microphone is on" : "Microphone is off"}
									</p>
									<p className="text-xs text-muted-foreground">
										{isOn ? "Speak to test your microphone" : "Click to unmute"}
									</p>
								</div>
							</div>
						</div>

						{/* Volume meter */}
						{isOn && (
							<div className="space-y-2">
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<span>Input level</span>
									<span>{level}%</span>
								</div>
								<div className="h-2 bg-muted rounded-full overflow-hidden">
									<div
										className={cn(
											"h-full transition-all duration-75",
											getLevelColor(level)
										)}
										style={{ width: `${level*2}%` }}
									/>
								</div>
								<div className="flex justify-between text-[10px] text-muted-foreground">
									<span>Quiet</span>
									<span>Loud</span>
								</div>
							</div>
						)}
					</div>
				)
			)}

			{/* Microphone selector */}
			{microphones.length > 0 && showControls && (
				<div className="flex items-center gap-2">
					<Mic className="size-4 text-muted-foreground shrink-0" />
					<select
						value={selectedMicrophoneId}
						onChange={(e) => onSelectMicrophone(e.target.value)}
						className="flex-1 min-w-0 h-8 px-2 text-xs bg-background border border-input rounded-none focus:outline-none focus:ring-1 focus:ring-ring truncate"
					>
						{microphones.map((mic) => (
							<option key={mic.deviceId} value={mic.deviceId}>
								{mic.label || `Microphone ${microphones.indexOf(mic) + 1}`}
							</option>
						))}
					</select>
				</div>
			)}
		</div>
	);
}
