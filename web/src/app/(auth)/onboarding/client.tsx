"use client";

import { useForm } from "@tanstack/react-form";
import { ArrowLeft, FileText, Loader2, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JobHistoryItem, ParsedResumeData } from "@/server/api/routers/onboarding";
import { authClient } from "@/server/better-auth/client";
import { api } from "@/trpc/react";

type OnboardingStep = "role" | "resume-upload" | "candidate-profile";

interface OnboardingClientProps {
	step: OnboardingStep;
}

export default function OnboardingClient({
	step: initialStep,
}: OnboardingClientProps) {
	const router = useRouter();
	const [currentStep, setCurrentStep] =
		React.useState<OnboardingStep>(initialStep);
	const [resumeUrl, setResumeUrl] = React.useState<string>("");
	const [parsedData, setParsedData] = React.useState<ParsedResumeData | null>(
		null,
	);
	// Track if user came from role selection (to enable back navigation)
	const [canGoBackToRole, setCanGoBackToRole] = React.useState(initialStep === "role");

	if (currentStep === "role") {
		return (
			<RoleSelectionStep
				onNext={(isRecruiter) => {
					if (isRecruiter) {
						router.push("/");
						router.refresh();
					} else {
						setCanGoBackToRole(true);
						setCurrentStep("resume-upload");
					}
				}}
			/>
		);
	}

	if (currentStep === "resume-upload") {
		return (
			<ResumeUploadStep
				onBack={canGoBackToRole ? () => setCurrentStep("role") : undefined}
				onNext={(url, data) => {
					setResumeUrl(url);
					setParsedData(data);
					setCurrentStep("candidate-profile");
				}}
				onSkip={() => {
					setCurrentStep("candidate-profile");
				}}
			/>
		);
	}

	return (
		<CandidateProfileStep 
			initialData={parsedData} 
			resumeUrl={resumeUrl}
			onBack={() => {
				setResumeUrl("");
				setParsedData(null);
				setCurrentStep("resume-upload");
			}}
		/>
	);
}

function RoleSelectionStep({
	onNext,
}: {
	onNext: (isRecruiter: boolean) => void;
}) {
	const [isRecruiter, setIsRecruiter] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			await authClient.updateUser({
				isRecruiter,
			});
			onNext(isRecruiter);
		} catch (error) {
			toast.error("Failed to update profile. Please try again.");
			setIsLoading(false);
		}
	};

	return (
		<Card className="w-full min-w-full max-w-md">
			<CardHeader>
				<CardTitle>Welcome!</CardTitle>
				<CardDescription>
					Let us know how you'll be using the platform.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-6" onSubmit={handleSubmit}>
					<Field>
						<FieldLabel>I'm a...</FieldLabel>
						<Tabs
							className="w-full"
							onValueChange={(value) => setIsRecruiter(value === "recruiter")}
							value={isRecruiter ? "recruiter" : "candidate"}
						>
							<TabsList className="w-full">
								<TabsTrigger className="flex-1" value="candidate">
									Candidate
								</TabsTrigger>
								<TabsTrigger className="flex-1" value="recruiter">
									Recruiter
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</Field>
					<Button className="w-full" disabled={isLoading} type="submit">
						{isLoading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : null}
						Continue
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function ResumeUploadStep({
	onNext,
	onSkip,
	onBack,
}: {
	onNext: (resumeUrl: string, parsedData: ParsedResumeData | null) => void;
	onSkip: () => void;
	onBack?: () => void;
}) {
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
					<Button
						variant="ghost"
						size="sm"
						onClick={onBack}
						disabled={isProcessing}
						className="w-fit -ml-2 mb-2 text-muted-foreground"
					>
						<ArrowLeft className="mr-1 h-4 w-4" />
						Back
					</Button>
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
				<div
					className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            ${isProcessing ? "pointer-events-none opacity-60" : ""}
          `}
					onClick={() => !isProcessing && fileInputRef.current?.click()}
					onDragLeave={handleDragLeave}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
				>
					<input
						accept=".pdf"
						className="hidden"
						disabled={isProcessing}
						onChange={handleFileSelect}
						ref={fileInputRef}
						type="file"
					/>

					{isProcessing ? (
						<div className="space-y-3">
							<Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
							<div>
								<p className="font-medium">
									{isUploading
										? "Uploading resume..."
										: "Analyzing your resume..."}
								</p>
								<p className="text-muted-foreground text-sm">
									{isUploading
										? "Please wait while we upload your file"
										: "Gemini is extracting your information"}
								</p>
							</div>
						</div>
					) : uploadedFile ? (
						<div className="space-y-3">
							<FileText className="mx-auto h-10 w-10 text-primary" />
							<div>
								<p className="font-medium">{uploadedFile.name}</p>
								<p className="text-muted-foreground text-sm">
									Click to change file
								</p>
							</div>
						</div>
					) : (
						<div className="space-y-3">
							<Upload className="mx-auto h-10 w-10 text-muted-foreground" />
							<div>
								<p className="font-medium">Drop your resume here</p>
								<p className="text-muted-foreground text-sm">
									or click to browse (PDF only)
								</p>
							</div>
						</div>
					)}
				</div>

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

const candidateProfileSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	phone: z.string().min(1, "Phone is required"),
	linkedin: z.string().url("Please enter a valid URL").or(z.literal("")),
	github: z.string().url("Please enter a valid URL").or(z.literal("")),
	twitter: z.string().url("Please enter a valid URL").or(z.literal("")),
	portfolio: z.string().url("Please enter a valid URL").or(z.literal("")),
	resume: z.string().min(1, "Resume is required"),
	skills: z.string().min(1, "Skills are required"),
	experience: z.string().min(1, "Experience is required"),
});

function CandidateProfileStep({
	resumeUrl,
	initialData,
	onBack,
}: {
	resumeUrl: string;
	initialData: ParsedResumeData | null;
	onBack: () => void;
}) {
	const router = useRouter();
	const [jobHistoryItems, setJobHistoryItems] = React.useState<JobHistoryItem[]>(
		initialData?.jobHistory ?? [],
	);

	const createProfile = api.onboarding.createCandidateProfile.useMutation({
		onSuccess: () => {
			router.push("/");
			router.refresh();
		},
		onError: (error) => {
			toast.error(error.message || "Failed to save profile. Please try again.");
		},
	});

	const form = useForm({
		defaultValues: {
			firstName: initialData?.firstName ?? "",
			lastName: initialData?.lastName ?? "",
			phone: initialData?.phone ?? "",
			linkedin: initialData?.linkedin ?? "",
			github: initialData?.github ?? "",
			twitter: initialData?.twitter ?? "",
			portfolio: initialData?.portfolio ?? "",
			resume: resumeUrl,
			skills: initialData?.skills ?? "",
			experience: initialData?.experience ?? "",
		},
		validators: {
			onSubmit: candidateProfileSchema,
		},
		onSubmit: async ({ value }) => {
			await createProfile.mutateAsync({
				...value,
				extraLinks: [],
				jobHistory: jobHistoryItems,
			});
		},
	});

	const addJobHistoryItem = () => {
		setJobHistoryItems([
			...jobHistoryItems,
			{
				companyName: "",
				jobTitle: "",
				startDate: "",
				endDate: null,
				description: "",
			},
		]);
	};

	const removeJobHistoryItem = (index: number) => {
		setJobHistoryItems(jobHistoryItems.filter((_, i) => i !== index));
	};

	const updateJobHistoryItem = (
		index: number,
		field: keyof JobHistoryItem,
		value: string | null,
	) => {
		setJobHistoryItems(
			jobHistoryItems.map((item, i) =>
				i === index ? { ...item, [field]: value } : item,
			),
		);
	};

	const hasAiData =
		initialData && Object.values(initialData).some((v) => v !== null);

	return (
		<Card className="w-full min-w-full max-w-2xl">
			<CardHeader>
				<Button
					variant="ghost"
					size="sm"
					onClick={onBack}
					className="w-fit -ml-2 mb-2 text-muted-foreground"
				>
					<ArrowLeft className="mr-1 h-4 w-4" />
					Back
				</Button>
				<CardTitle>
					{hasAiData ? "Review Your Profile" : "Complete Your Profile"}
				</CardTitle>
				<CardDescription>
					{hasAiData
						? "We've pre-filled some fields from your resume. Please review and complete the rest."
						: "Tell us about yourself so recruiters can find you."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					className="space-y-4"
					onSubmit={async (e) => {
						e.preventDefault();
						e.stopPropagation();
						await form.handleSubmit();
					}}
				>
					<div className="grid grid-cols-2 gap-4">
						<form.Field
							children={(field) => (
								<Field>
									<FieldLabel>First Name</FieldLabel>
									<Input
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="John"
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<FieldError errors={field.state.meta.errors} />
									)}
								</Field>
							)}
							name="firstName"
						/>
						<form.Field
							children={(field) => (
								<Field>
									<FieldLabel>Last Name</FieldLabel>
									<Input
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Doe"
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<FieldError errors={field.state.meta.errors} />
									)}
								</Field>
							)}
							name="lastName"
						/>
					</div>

					<form.Field
						children={(field) => (
							<Field>
								<FieldLabel>Phone</FieldLabel>
								<Input
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="+1 (555) 123-4567"
									type="tel"
									value={field.state.value}
								/>
								{field.state.meta.errors.length > 0 && (
									<FieldError errors={field.state.meta.errors} />
								)}
							</Field>
						)}
						name="phone"
					/>

					<div className="grid grid-cols-2 gap-4">
						<form.Field
							children={(field) => (
								<Field>
									<FieldLabel>LinkedIn</FieldLabel>
									<Input
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="https://linkedin.com/in/johndoe"
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<FieldError errors={field.state.meta.errors} />
									)}
								</Field>
							)}
							name="linkedin"
						/>
						<form.Field
							children={(field) => (
								<Field>
									<FieldLabel>Portfolio Website</FieldLabel>
									<Input
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="https://johndoe.com"
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<FieldError errors={field.state.meta.errors} />
									)}
								</Field>
							)}
							name="portfolio"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<form.Field
							children={(field) => (
								<Field>
									<FieldLabel>GitHub</FieldLabel>
									<Input
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="https://github.com/johndoe"
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<FieldError errors={field.state.meta.errors} />
									)}
								</Field>
							)}
							name="github"
						/>
						<form.Field
							children={(field) => (
								<Field>
									<FieldLabel>Twitter</FieldLabel>
									<Input
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="https://twitter.com/johndoe"
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<FieldError errors={field.state.meta.errors} />
									)}
								</Field>
							)}
							name="twitter"
						/>
					</div>

					<form.Field
						children={(field) => (
							<Field>
								<FieldLabel>Resume</FieldLabel>
								<FieldDescription>
									{resumeUrl
										? "Your uploaded resume"
										: "Link to your resume (Google Drive, Dropbox, etc.)"}
								</FieldDescription>
								<Input
									className={resumeUrl ? "bg-muted" : ""}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="https://drive.google.com/..."
									readOnly={!!resumeUrl}
									value={field.state.value}
								/>
								{field.state.meta.errors.length > 0 && (
									<FieldError errors={field.state.meta.errors} />
								)}
							</Field>
						)}
						name="resume"
					/>

					<form.Field
						children={(field) => (
							<Field>
								<FieldLabel>Skills</FieldLabel>
								<FieldDescription>
									List your key skills (e.g., React, TypeScript, Node.js)
								</FieldDescription>
								<Input
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="React, TypeScript, Node.js, PostgreSQL"
									value={field.state.value}
								/>
								{field.state.meta.errors.length > 0 && (
									<FieldError errors={field.state.meta.errors} />
								)}
							</Field>
						)}
						name="skills"
					/>

					<form.Field
						children={(field) => (
							<Field>
								<FieldLabel>Experience Summary</FieldLabel>
								<FieldDescription>
									Brief summary of your experience
								</FieldDescription>
								<Input
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="3 years of full-stack development..."
									value={field.state.value}
								/>
								{field.state.meta.errors.length > 0 && (
									<FieldError errors={field.state.meta.errors} />
								)}
							</Field>
						)}
						name="experience"
					/>

					{/* Job History Section */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<FieldLabel>Job History</FieldLabel>
								<FieldDescription>
									Add your work experience
								</FieldDescription>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={addJobHistoryItem}
							>
								<Plus className="mr-1 h-4 w-4" />
								Add
							</Button>
						</div>

						{jobHistoryItems.length === 0 ? (
							<div className="rounded-lg border border-dashed p-6 text-center">
								<p className="text-sm text-muted-foreground">
									No job history added yet. Click "Add" to add your work experience.
								</p>
							</div>
						) : (
							<div className="space-y-4">
								{jobHistoryItems.map((job, index) => (
									<Card key={index} className="relative">
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive"
											onClick={() => removeJobHistoryItem(index)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
										<CardContent className="pt-6 space-y-4">
											<div className="grid grid-cols-2 gap-4">
												<Field>
													<FieldLabel>Company Name</FieldLabel>
													<Input
														placeholder="Acme Inc."
														value={job.companyName}
														onChange={(e) =>
															updateJobHistoryItem(index, "companyName", e.target.value)
														}
													/>
												</Field>
												<Field>
													<FieldLabel>Job Title</FieldLabel>
													<Input
														placeholder="Software Engineer"
														value={job.jobTitle}
														onChange={(e) =>
															updateJobHistoryItem(index, "jobTitle", e.target.value)
														}
													/>
												</Field>
											</div>
											<div className="grid grid-cols-2 gap-4">
												<Field>
													<FieldLabel>Start Date</FieldLabel>
													<Input
														placeholder="Jan 2020"
														value={job.startDate}
														onChange={(e) =>
															updateJobHistoryItem(index, "startDate", e.target.value)
														}
													/>
												</Field>
												<Field>
													<FieldLabel>End Date</FieldLabel>
													<Input
														placeholder="Present (leave empty if current)"
														value={job.endDate ?? ""}
														onChange={(e) =>
															updateJobHistoryItem(
																index,
																"endDate",
																e.target.value || null,
															)
														}
													/>
												</Field>
											</div>
											<Field>
												<FieldLabel>Description</FieldLabel>
												<Input
													placeholder="Brief description of your responsibilities..."
													value={job.description}
													onChange={(e) =>
														updateJobHistoryItem(index, "description", e.target.value)
													}
												/>
											</Field>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</div>

					<Button
						className="w-full"
						disabled={form.state.isSubmitting || createProfile.isPending}
						type="submit"
					>
						{form.state.isSubmitting || createProfile.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : null}
						Complete Profile
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
