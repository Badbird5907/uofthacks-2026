import * as React from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { BackButton } from "../back-button";
import { UploadZone } from "../upload-zone";
import type { ParsedResumeData } from "@/server/api/routers/onboarding";
import { api } from "@/trpc/react";

interface ResumeUploadStepProps {
	onNext: (resumeUrl: string, parsedData: ParsedResumeData | null) => void;
	onSkip: () => void;
	onBack?: () => void;
}

export function ResumeUploadStep({
	onNext,
	onSkip,
	onBack,
}: ResumeUploadStepProps) {
	const [isDragging, setIsDragging] = React.useState(false);
	const [isUploading, setIsUploading] = React.useState(false);
	const [isParsing, setIsParsing] = React.useState(false);
	const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const getUploadUrl = api.onboarding.getResumeUploadUrl.useMutation();
	const parseResume = api.onboarding.parseResume.useMutation();

	const handleFile = async (file: File) => {
		if (file.type !== "application/pdf") {
			toast.error("Please upload a PDF file");
			return;
		}

		setUploadedFile(file);
		setIsUploading(true);

		try {
			// Get presigned upload URL
			const { uploadUrl, fileUrl, key } = await getUploadUrl.mutateAsync({
				filename: file.name,
				contentType: file.type,
			});

			// Upload file directly to S3
			const uploadResponse = await fetch(uploadUrl, {
				method: "PUT",
				body: file,
				headers: {
					"Content-Type": file.type,
				},
			});

			if (!uploadResponse.ok) {
				throw new Error("Failed to upload file");
			}

			setIsUploading(false);
			setIsParsing(true);

			// Parse resume with AI
			const parsedData = await parseResume.mutateAsync({
				resumeUrl: fileUrl,
				key,
			});

			setIsParsing(false);
			onNext(fileUrl, parsedData);
		} catch (error) {
			console.error("Upload error:", error);
			toast.error("Failed to upload resume. Please try again.");
			setIsUploading(false);
			setIsParsing(false);
			setUploadedFile(null);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files[0];
		if (file) {
			handleFile(file);
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleFile(file);
		}
	};

	const isProcessing = isUploading || isParsing;

	return (
		<Card className="w-full min-w-full max-w-md">
			<CardHeader>
				{onBack && (
					<BackButton onClick={onBack} disabled={isProcessing} />
				)}
				<CardTitle className="flex items-center gap-2">
					<Sparkles className="h-5 w-5 text-primary" />
					Upload Your Resume
				</CardTitle>
				<CardDescription>
					We'll automatically fill in your profile using Gemini. You can review and
					edit everything afterward.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<UploadZone
					isDragging={isDragging}
					isProcessing={isProcessing}
					isUploading={isUploading}
					uploadedFile={uploadedFile}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					onClick={() => !isProcessing && fileInputRef.current?.click()}
					fileInputRef={fileInputRef}
					onFileSelect={handleFileSelect}
				/>

				<div className="text-center">
					<Button
						className="text-muted-foreground"
						disabled={isProcessing}
						onClick={onSkip}
						variant="ghost"
					>
						Skip and fill manually
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
