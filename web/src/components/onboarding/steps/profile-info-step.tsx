import { useForm } from "@tanstack/react-form";
import { Loader2, User } from "lucide-react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { BackButton } from "../back-button";
import { FormFieldWrapper } from "../form-field-wrapper";
import { StepProgress } from "../step-progress";
import type { ParsedResumeData } from "@/server/api/routers/onboarding";

export interface ProfileData {
	firstName: string;
	lastName: string;
	phone: string;
	linkedin: string;
	github: string;
	twitter: string;
	portfolio: string;
	resume: string;
	skills: string;
	experience: string;
}

interface ProfileInfoStepProps {
	resumeUrl: string;
	initialData: ParsedResumeData | null;
	savedData: ProfileData | null;
	onBack: () => void;
	onNext: (data: ProfileData) => void;
	onStepClick?: (stepNumber: number) => void;
	maxClickableStep?: number;
}

const profileInfoSchema = z.object({
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

export function ProfileInfoStep({
	resumeUrl,
	initialData,
	savedData,
	onBack,
	onNext,
	onStepClick,
	maxClickableStep,
}: ProfileInfoStepProps) {
	const form = useForm({
		defaultValues: {
			firstName: savedData?.firstName ?? initialData?.firstName ?? "",
			lastName: savedData?.lastName ?? initialData?.lastName ?? "",
			phone: savedData?.phone ?? initialData?.phone ?? "",
			linkedin: savedData?.linkedin ?? initialData?.linkedin ?? "",
			github: savedData?.github ?? initialData?.github ?? "",
			twitter: savedData?.twitter ?? initialData?.twitter ?? "",
			portfolio: savedData?.portfolio ?? initialData?.portfolio ?? "",
			resume: savedData?.resume ?? resumeUrl,
			skills: savedData?.skills ?? initialData?.skills ?? "",
			experience: savedData?.experience ?? initialData?.experience ?? "",
		},
		validators: {
			onSubmit: profileInfoSchema,
		},
		onSubmit: async ({ value }) => {
			onNext(value);
		},
	});

	const hasAiData =
		initialData && Object.values(initialData).some((v) => v !== null);

	return (
		<Card className="w-full min-w-full max-w-2xl">
			<CardHeader>
				<div className="flex items-center justify-between">
					<BackButton onClick={onBack} />
					<StepProgress
						currentStep={1}
						totalSteps={3}
						steps={["Profile Info", "Job History", "Education"]}
						onStepClick={onStepClick}
						maxClickableStep={maxClickableStep}
					/>
				</div>
				<CardTitle className="flex items-center gap-2">
					<User className="h-5 w-5" />
					{hasAiData ? "Review Your Profile" : "Basic Information"}
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
						<form.Field name="firstName">
							{(field) => (
								<FormFieldWrapper
									field={field}
									label="First Name"
									placeholder="John"
								/>
							)}
						</form.Field>
						<form.Field name="lastName">
							{(field) => (
								<FormFieldWrapper
									field={field}
									label="Last Name"
									placeholder="Doe"
								/>
							)}
						</form.Field>
					</div>

					<form.Field name="phone">
						{(field) => (
							<FormFieldWrapper
								field={field}
								label="Phone"
								placeholder="+1 (555) 123-4567"
								type="tel"
							/>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="linkedin">
							{(field) => (
								<FormFieldWrapper
									field={field}
									label="LinkedIn"
									placeholder="https://linkedin.com/in/johndoe"
								/>
							)}
						</form.Field>
						<form.Field name="portfolio">
							{(field) => (
								<FormFieldWrapper
									field={field}
									label="Portfolio Website"
									placeholder="https://johndoe.com"
								/>
							)}
						</form.Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="github">
							{(field) => (
								<FormFieldWrapper
									field={field}
									label="GitHub"
									placeholder="https://github.com/johndoe"
								/>
							)}
						</form.Field>
						<form.Field name="twitter">
							{(field) => (
								<FormFieldWrapper
									field={field}
									label="Twitter"
									placeholder="https://twitter.com/johndoe"
								/>
							)}
						</form.Field>
					</div>

					<form.Field name="resume">
						{(field) => (
							<FormFieldWrapper
								field={field}
								label="Resume"
								placeholder="https://drive.google.com/..."
								description={
									resumeUrl
										? "Your uploaded resume"
										: "Link to your resume (Google Drive, Dropbox, etc.)"
								}
								readOnly={!!resumeUrl}
								className={resumeUrl ? "bg-muted" : ""}
							/>
						)}
					</form.Field>

					<form.Field name="skills">
						{(field) => (
							<FormFieldWrapper
								field={field}
								label="Skills"
								placeholder="React, TypeScript, Node.js, PostgreSQL"
								description="List your key skills (e.g., React, TypeScript, Node.js)"
							/>
						)}
					</form.Field>

					<form.Field name="experience">
						{(field) => (
							<FormFieldWrapper
								field={field}
								label="Experience Summary"
								placeholder="3 years of full-stack development..."
								description="Brief summary of your experience"
							/>
						)}
					</form.Field>

					<Button
						className="w-full"
						disabled={form.state.isSubmitting}
						type="submit"
					>
						{form.state.isSubmitting ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : null}
						Continue to Job History
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
