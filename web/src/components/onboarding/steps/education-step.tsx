import * as React from "react";
import { GraduationCap, Loader2 } from "lucide-react";
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
import { EducationItemCard } from "../education-item-card";
import { EmptyState } from "../empty-state";
import { ItemListHeader } from "../item-list-header";
import { StepProgress } from "../step-progress";
import type {
	EducationItem,
	JobHistoryItem,
} from "@/server/api/routers/onboarding";
import { api } from "@/trpc/react";
import type { ProfileData } from "./profile-info-step";

interface EducationStepProps {
	initialData: EducationItem[];
	profileData: ProfileData;
	jobHistoryItems: JobHistoryItem[];
	onBack: () => void;
	onSuccess: () => void;
	onStepClick?: (stepNumber: number) => void;
	maxClickableStep?: number;
}

export function EducationStep({
	initialData,
	profileData,
	jobHistoryItems,
	onBack,
	onSuccess,
	onStepClick,
	maxClickableStep,
}: EducationStepProps) {
	const [educationItems, setEducationItems] =
		React.useState<EducationItem[]>(initialData);
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	const createProfile = api.onboarding.createCandidateProfile.useMutation({
		onSuccess: () => {
			onSuccess();
		},
		onError: (error) => {
			toast.error(error.message || "Failed to save profile. Please try again.");
			setIsSubmitting(false);
		},
	});

	const addEducationItem = () => {
		setEducationItems([
			...educationItems,
			{
				institution: "",
				degree: "",
				fieldOfStudy: "",
				startDate: "",
				endDate: null,
				description: null,
			},
		]);
	};

	const removeEducationItem = (index: number) => {
		setEducationItems(educationItems.filter((_, i) => i !== index));
	};

	const updateEducationItem = (
		index: number,
		field: keyof EducationItem,
		value: string | null,
	) => {
		setEducationItems(
			educationItems.map((item, i) =>
				i === index ? { ...item, [field]: value } : item,
			),
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		await createProfile.mutateAsync({
			...profileData,
			extraLinks: [],
			jobHistory: jobHistoryItems,
			education: educationItems,
		});
	};

	return (
		<Card className="w-full min-w-full max-w-2xl">
			<CardHeader>
				<div className="flex items-center justify-between">
					<BackButton onClick={onBack} disabled={isSubmitting} />
					<StepProgress
						currentStep={3}
						totalSteps={3}
						steps={["Profile Info", "Job History", "Education"]}
						onStepClick={onStepClick}
						maxClickableStep={maxClickableStep}
					/>
				</div>
				<CardTitle className="flex items-center gap-2">
					<GraduationCap className="h-5 w-5" />
					Education
				</CardTitle>
				<CardDescription>
					Add your educational background. You can skip this step if you prefer.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-4">
						<ItemListHeader
							label="Education"
							description="Add your degrees and certifications"
							onAdd={addEducationItem}
							disabled={isSubmitting}
						/>

						{educationItems.length === 0 ? (
							<EmptyState
								icon={GraduationCap}
								message='No education added yet. Click "Add" to add your educational background.'
							/>
						) : (
							<div className="space-y-4">
								{educationItems.map((edu, index) => (
									<EducationItemCard
										key={index}
										education={edu}
										index={index}
										disabled={isSubmitting}
										onUpdate={updateEducationItem}
										onRemove={removeEducationItem}
									/>
								))}
							</div>
						)}
					</div>

					<Button
						className="w-full"
						disabled={isSubmitting || createProfile.isPending}
						type="submit"
					>
						{isSubmitting || createProfile.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : null}
						Complete Profile
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
