"use client";

import {
	ArrowLeft,
	CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaDevices } from "@/hooks/use-media-devices";
import { VideoPreview } from "./video-preview";
import { AudioTest } from "./audio-test";

interface DeviceCheckScreenProps {
	jobId: string;
	jobTitle: string;
	companyName?: string;
	onReady: () => void;
	className?: string;
}

export function DeviceCheckScreen({
	jobId,
	jobTitle,
	companyName,
	onReady,
	className,
}: DeviceCheckScreenProps) {
	const {
		cameraStream,
		microphoneStream,
		cameras,
		microphones,
		selectedCameraId,
		selectedMicrophoneId,
		cameraStatus,
		microphoneStatus,
		selectCamera,
		selectMicrophone,
		toggleCamera,
		toggleMicrophone,
		requestPermissions,
		isCameraOn,
		isMicrophoneOn,
		isReady,
	} = useMediaDevices();

	const isLoading = cameraStatus === "requesting" || microphoneStatus === "requesting";
	const hasErrors = cameraStatus === "denied" || cameraStatus === "error" ||
		microphoneStatus === "denied" || microphoneStatus === "error";

	return (
		<div className={cn("flex flex-col h-full", className)}>
			{/* Header */}
			<div className="border-b p-4 shrink-0">
				<div className="max-w-3xl mx-auto flex flex-row gap-4 items-center">
					<Button variant="ghost" size="sm" asChild className="w-fit -ml-2 text-muted-foreground">
						<Link href={`/c/jobs/${jobId}`}>
							<ArrowLeft className="mr-1 h-4 w-4" />
						</Link>
					</Button>
					<div>
						
						<h1 className="text-lg font-semibold">{jobTitle}</h1>
						{companyName && (
							<p className="text-sm text-muted-foreground">{companyName}</p>
						)}
					</div>
				</div>
			</div>

			{/* Main content */}
			<div className="flex-1 overflow-y-auto p-4">
				<div className="max-w-3xl mx-auto space-y-6">
					{/* Title section */}
					<div className="text-center space-y-2">
						<h2 className="text-xl font-semibold">Get ready for your interview</h2>
						<p className="text-sm text-muted-foreground">
							Before we begin, let's make sure your camera and microphone are working properly.
						</p>
					</div>

					{/* Device check panels */}
					<div className="grid gap-6 md:grid-cols-2">
						{/* Camera panel */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-medium">Camera</h3>
								{cameraStatus === "granted" && (
									<span className="flex items-center gap-1 text-xs text-green-600">
										<CheckCircle2 className="size-3.5" />
										Ready
									</span>
								)}
							</div>
							<VideoPreview
								stream={cameraStream}
								status={cameraStatus}
								isOn={isCameraOn}
								cameras={cameras}
								selectedCameraId={selectedCameraId}
								onSelectCamera={selectCamera}
								onRetry={requestPermissions}
							/>
						</div>

						{/* Microphone panel */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-medium">Microphone</h3>
								{microphoneStatus === "granted" && (
									<span className="flex items-center gap-1 text-xs text-green-600">
										<CheckCircle2 className="size-3.5" />
										Ready
									</span>
								)}
							</div>
							<AudioTest
								stream={microphoneStream}
								status={microphoneStatus}
								isOn={isMicrophoneOn}
								microphones={microphones}
								selectedMicrophoneId={selectedMicrophoneId}
								onSelectMicrophone={selectMicrophone}
								onToggle={toggleMicrophone}
								onRetry={requestPermissions}
							/>
						</div>
					</div>

					{/* Status message */}
					{!isLoading && (
						<div className={cn(
							"p-3 text-sm text-center border",
							isReady
								? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
								: hasErrors
									? "bg-destructive/10 border-destructive/20 text-destructive"
									: "bg-muted border-border text-muted-foreground"
						)}>
							{isReady
								? "Your camera and microphone are ready. You can start the interview when you're ready."
								: hasErrors
									? "Please grant camera and microphone permissions to continue."
									: "Checking your devices..."}
						</div>
					)}

					{/* Tips */}
					<div className="grid grid-cols-2 gap-4">
						<div className="col-span-1 space-y-2">
							<h3 className="text-sm font-medium">Tips for a great interview</h3>
							<ul className="text-xs text-muted-foreground space-y-1.5">
								<li className="flex items-start gap-2">
									<span className="text-foreground">1.</span>
									Find a quiet, well-lit space
								</li>
								<li className="flex items-start gap-2">
									<span className="text-foreground">2.</span>
									Position yourself at eye level with the camera
								</li>
								<li className="flex items-start gap-2">
									<span className="text-foreground">3.</span>
									Test your audio by speaking - you should see the level meter move
								</li>
								<li className="flex items-start gap-2">
									<span className="text-foreground">4.</span>
									Close other applications that might use your camera or microphone
								</li>
							</ul>
						</div>
						<div className="col-span-1 place-self-center">
							<Button
								size="lg"
								onClick={onReady}
								disabled={!isReady || isLoading}
							>
								{isLoading ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Checking devices...
									</>
								) : (
									<>
										Start Interview
										<ArrowRight className="size-4" />
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			</div>

		</div>
	);
}
