import * as React from "react";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { BackButton } from "../back-button";
import { EmptyState } from "../empty-state";
import { ItemListHeader } from "../item-list-header";
import { JobHistoryItemCard } from "../job-history-item-card";
import { StepProgress } from "../step-progress";
import type { JobHistoryItem } from "@/server/api/routers/onboarding";

interface JobHistoryStepProps {
	initialData: JobHistoryItem[];
	onBack: () => void;
	onNext: (items: JobHistoryItem[]) => void;
	onStepClick?: (stepNumber: number) => void;
	maxClickableStep?: number;
}

export function JobHistoryStep({
	initialData,
	onBack,
	onNext,
	onStepClick,
	maxClickableStep,
}: JobHistoryStepProps) {
	const [jobHistoryItems, setJobHistoryItems] =
		React.useState<JobHistoryItem[]>(initialData);

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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onNext(jobHistoryItems);
	};

	return (
		<Card className="w-full min-w-full max-w-2xl">
			<CardHeader>
				<div className="flex items-center justify-between">
					<BackButton onClick={onBack} />
					<StepProgress
						currentStep={2}
						totalSteps={3}
						steps={["Profile Info", "Job History", "Education"]}
						onStepClick={onStepClick}
						maxClickableStep={maxClickableStep}
					/>
				</div>
				<CardTitle className="flex items-center gap-2">
					<Briefcase className="h-5 w-5" />
					Work Experience
				</CardTitle>
				<CardDescription>
					Add your work history. You can skip this step if you don't have any
					work experience yet.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-4">
						<ItemListHeader
							label="Job History"
							description="Add your previous positions"
							onAdd={addJobHistoryItem}
						/>

						{jobHistoryItems.length === 0 ? (
							<EmptyState
								icon={Briefcase}
								message='No job history added yet. Click "Add" to add your work experience.'
							/>
						) : (
							<div className="space-y-4">
								{jobHistoryItems.map((job, index) => (
									<JobHistoryItemCard
										key={index}
										job={job}
										index={index}
										onUpdate={updateJobHistoryItem}
										onRemove={removeJobHistoryItem}
									/>
								))}
							</div>
						)}
					</div>

					<Button className="w-full" type="submit">
						Continue to Education
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
