"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DeviceCheckScreen } from "@/components/video-interview/device-check-screen";
import { api } from "@/trpc/react";
import { InterviewScreen } from "@/components/video-interview/interview-screen";

type InterviewStep = "device-check" | "interview" | "complete";

export default function ApplyPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const [step, setStep] = useState<InterviewStep>("device-check");

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
	const handleInterviewComplete = () => {
		setStep("complete");
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
				<InterviewScreen />
			</div>
		);
	}

	// Interview complete step
	return (
		<div className="min-h-screen flex flex-col">
			<div className="flex-1 flex items-center justify-center p-4">
				<div className="text-center space-y-4 max-w-md">
					<div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
						<span className="text-2xl text-green-500">✓</span>
					</div>
					<h2 className="text-xl font-semibold">Interview Complete!</h2>
					<p className="text-sm text-muted-foreground">
						Thank you for completing your interview for {job.title}
						{job.organization?.name && ` at ${job.organization.name}`}.
						Your recording has been downloaded.
					</p>
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
