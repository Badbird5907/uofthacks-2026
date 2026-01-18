"use client";

import { Video, VideoOff, AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/hooks/use-media-devices";

interface VideoPreviewProps {
	stream: MediaStream | null;
	status: DeviceStatus;
	isOn: boolean;
	cameras: MediaDeviceInfo[];
	selectedCameraId: string;
	onSelectCamera: (deviceId: string) => void;
	onRetry: () => void;
	className?: string;
}

export function VideoPreview({
	stream,
	status,
	isOn,
	cameras,
	selectedCameraId,
	onSelectCamera,
	onRetry,
	className,
}: VideoPreviewProps) {
	const videoRef = useRef<HTMLVideoElement>(null);

	// Attach stream to video element
	useEffect(() => {
		if (videoRef.current && stream) {
			videoRef.current.srcObject = stream;
		}
	}, [stream]);

	const renderContent = () => {
		// Requesting permission
		if (status === "requesting" || status === "idle") {
			return (
				<div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
					<div className="size-12 rounded-full bg-muted flex items-center justify-center animate-pulse">
						<Video className="size-6" />
					</div>
					<p className="text-sm">Requesting camera access...</p>
				</div>
			);
		}

		// Permission denied
		if (status === "denied") {
			return (
				<div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
					<div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
						<AlertCircle className="size-6" />
					</div>
					<div className="text-center space-y-1">
						<p className="text-sm font-medium text-foreground">Camera access denied</p>
						<p className="text-xs">Please allow camera access in your browser settings</p>
					</div>
					<Button variant="outline" size="sm" onClick={onRetry}>
						<RefreshCw className="size-3.5" />
						Try Again
					</Button>
				</div>
			);
		}

		// Error state
		if (status === "error") {
			return (
				<div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
					<div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
						<VideoOff className="size-6" />
					</div>
					<div className="text-center space-y-1">
						<p className="text-sm font-medium text-foreground">Camera not available</p>
						<p className="text-xs">Please check your camera connection</p>
					</div>
					<Button variant="outline" size="sm" onClick={onRetry}>
						<RefreshCw className="size-3.5" />
						Retry
					</Button>
				</div>
			);
		}

		// Stream ready - show video
		return null;
	};

	const content = renderContent();
	const showVideo = status === "granted" && isOn && stream;

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			{/* Video container */}
			<div className="relative aspect-video bg-black/90 overflow-hidden border border-border">
				{/* Video element */}
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					className={cn(
						"absolute inset-0 w-full h-full object-cover scale-x-[-1]", // Mirror effect
						!showVideo && "hidden"
					)}
				/>

				{/* Overlay content when video not showing */}
				{content && (
					<div className="absolute inset-0 flex items-center justify-center">
						{content}
					</div>
				)}
			</div>

			{/* Camera selector */}
			{cameras.length > 0 && status === "granted" && (
				<div className="flex items-center gap-2">
					<Video className="size-4 text-muted-foreground shrink-0" />
					<select
						value={selectedCameraId}
						onChange={(e) => onSelectCamera(e.target.value)}
						className="flex-1 h-8 px-2 text-xs bg-background border border-input rounded-none focus:outline-none focus:ring-1 focus:ring-ring"
					>
						{cameras.map((camera) => (
							<option key={camera.deviceId} value={camera.deviceId}>
								{camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
							</option>
						))}
					</select>
				</div>
			)}
		</div>
	);
}
