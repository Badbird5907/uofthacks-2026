import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { JobHistoryItem } from "@/server/api/routers/onboarding";

interface JobHistoryItemCardProps {
	job: JobHistoryItem;
	index: number;
	disabled?: boolean;
	onUpdate: (index: number, field: keyof JobHistoryItem, value: string | null) => void;
	onRemove: (index: number) => void;
}

export function JobHistoryItemCard({
	job,
	index,
	disabled = false,
	onUpdate,
	onRemove,
}: JobHistoryItemCardProps) {
	return (
		<Card className="relative">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive"
				onClick={() => onRemove(index)}
				disabled={disabled}
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
							onChange={(e) => onUpdate(index, "companyName", e.target.value)}
							disabled={disabled}
						/>
					</Field>
					<Field>
						<FieldLabel>Job Title</FieldLabel>
						<Input
							placeholder="Software Engineer"
							value={job.jobTitle}
							onChange={(e) => onUpdate(index, "jobTitle", e.target.value)}
							disabled={disabled}
						/>
					</Field>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<Field>
						<FieldLabel>Start Date</FieldLabel>
						<Input
							placeholder="Jan 2020"
							value={job.startDate}
							onChange={(e) => onUpdate(index, "startDate", e.target.value)}
							disabled={disabled}
						/>
					</Field>
					<Field>
						<FieldLabel>End Date</FieldLabel>
						<Input
							placeholder="Present (leave empty if current)"
							value={job.endDate ?? ""}
							onChange={(e) => onUpdate(index, "endDate", e.target.value || null)}
							disabled={disabled}
						/>
					</Field>
				</div>
				<Field>
					<FieldLabel>Description</FieldLabel>
					<Input
						placeholder="Brief description of your responsibilities..."
						value={job.description}
						onChange={(e) => onUpdate(index, "description", e.target.value)}
						disabled={disabled}
					/>
				</Field>
			</CardContent>
		</Card>
	);
}
