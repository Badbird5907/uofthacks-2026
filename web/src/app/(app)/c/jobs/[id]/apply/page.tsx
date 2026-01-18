"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DeviceCheckScreen } from "@/components/video-interview/device-check-screen";
import { api } from "@/trpc/react";
import { InterviewScreen } from "@/components/video-interview/interview-screen";

type InterviewStep = "device-check" | "interview" | "uploading" | "complete";

export default function ApplyPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const [step, setStep] = useState<InterviewStep>("device-check");
	const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);

	const getUploadUrl = api.jobPosting.getInterviewUploadUrl.useMutation();
	const completeInterview = api.jobPosting.completeInterview.useMutation();

	const { data: job, isLoading, error } = api.jobPosting.getByIdPublic.useQuery(
		{ id },
		{ enabled: !!id }
	);

	// Loading state
	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Spinner className="size-6" />
			</div>
		);
	}

	// Error state
	if (error || !job) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-4">
				<p className="text-muted-foreground">
					{error?.message || "Job posting not found"}
				</p>
				<Button asChild variant="outline">
					<Link href="/c/jobs">
						<ArrowLeft className="size-4" />
						Back to Jobs
					</Link>
				</Button>
			</div>
		);
	}

	// Handle next step after device check
	const handleDeviceCheckComplete = () => {
		setStep("interview");
	};

	// Handle interview completion
	const handleInterviewComplete = async (videoBlob: Blob | null) => {
		if (!videoBlob) {
			console.log("[INFO] No video blob to upload");
			setStep("complete");
			return;
		}

		setStep("uploading");
		setUploadError(null);

		try {
			// Get the signed upload URL
			const { uploadUrl, fileUrl } = await getUploadUrl.mutateAsync({
				jobId: id,
				contentType: videoBlob.type || "video/webm",
			});

			console.log("[INFO] Got upload URL, uploading video...");

			// Upload the video to the signed URL
			const uploadResponse = await fetch(uploadUrl, {
				method: "PUT",
				body: videoBlob,
				headers: {
					"Content-Type": videoBlob.type || "video/webm",
				},
			});

			if (!uploadResponse.ok) {
				throw new Error(`Upload failed with status ${uploadResponse.status}`);
			}

			console.log("[SUCCESS] Video uploaded successfully!");
			console.log("[VIDEO URL]", fileUrl);

			// Submit the interview completion with the video URL
			console.log("[INFO] Submitting interview completion...");
			await completeInterview.mutateAsync({
				jobPostingId: id,
				recordingUrl: fileUrl,
				transcriptResponses: [], // Empty array for now, will be populated later
			});

			console.log("[SUCCESS] Interview submission complete!");

			setUploadedVideoUrl(fileUrl);
			setStep("complete");
		} catch (error) {
			console.error("[ERROR] Failed to upload video:", error);
			setUploadError(error instanceof Error ? error.message : "Failed to upload video");
			setStep("complete");
		}
	};

	// Device check step
	if (step === "device-check") {
		return (
			<div className="min-h-screen flex flex-col">
				<DeviceCheckScreen
					jobId={id}
					jobTitle={job.title}
					companyName={job.organization?.name}
					onReady={handleDeviceCheckComplete}
					className="flex-1"
				/>
			</div>
		);
	}

	// Interview step
	if (step === "interview") {
		return (
			<div className="min-h-screen flex flex-col">
				{/* interview screen */}
				<InterviewScreen 
					jobId={id} 
					jobTitle={job.title} 
					companyName={job.organization?.name}
					onInterviewComplete={handleInterviewComplete}
					jobDescription={job.description}
					interviewQuestions={job.interviewQuestions}
				/>
			</div>
		);
	}

	// Uploading step
	if (step === "uploading") {
		return (
			<div className="min-h-screen flex flex-col">
				<div className="flex-1 flex items-center justify-center p-4">
					<div className="text-center space-y-4 max-w-md">
						<Spinner className="size-8 mx-auto" />
						<h2 className="text-xl font-semibold">Uploading your interview...</h2>
						<p className="text-sm text-muted-foreground">
							Please wait while we upload your recording.
						</p>
					</div>
				</div>
			</div>
		);
	}

	// Interview complete step
	return (
		<div className="min-h-screen flex flex-col">
			<div className="flex-1 flex items-center justify-center p-4">
				<div className="text-center space-y-4 max-w-md">
					{uploadError ? (
						<>
							<div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
								<span className="text-2xl text-red-500">!</span>
							</div>
							<h2 className="text-xl font-semibold">Upload Failed</h2>
							<p className="text-sm text-muted-foreground">
								There was an error uploading your interview: {uploadError}
							</p>
						</>
					) : (
						<>
							<div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
								<span className="text-2xl text-green-500">✓</span>
							</div>
							<h2 className="text-xl font-semibold">Interview Complete!</h2>
							<p className="text-sm text-muted-foreground">
								Thank you for completing your interview for {job.title}
								{job.organization?.name && ` at ${job.organization.name}`}.
								{uploadedVideoUrl ? " Your recording has been uploaded successfully." : ""}
							</p>
						</>
					)}
					<Button asChild>
						<Link href={`/c/jobs/${id}`}>
							Back to Job Posting
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
