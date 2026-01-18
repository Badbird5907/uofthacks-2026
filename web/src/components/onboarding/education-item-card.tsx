import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { EducationItem } from "@/server/api/routers/onboarding";

interface EducationItemCardProps {
	education: EducationItem;
	index: number;
	disabled?: boolean;
	onUpdate: (index: number, field: keyof EducationItem, value: string | null) => void;
	onRemove: (index: number) => void;
}

export function EducationItemCard({
	education,
	index,
	disabled = false,
	onUpdate,
	onRemove,
}: EducationItemCardProps) {
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
						<FieldLabel>Institution</FieldLabel>
						<Input
							placeholder="University of Example"
							value={education.institution}
							onChange={(e) => onUpdate(index, "institution", e.target.value)}
							disabled={disabled}
						/>
					</Field>
					<Field>
						<FieldLabel>Degree</FieldLabel>
						<Input
							placeholder="Bachelor of Science"
							value={education.degree}
							onChange={(e) => onUpdate(index, "degree", e.target.value)}
							disabled={disabled}
						/>
					</Field>
				</div>
				<Field>
					<FieldLabel>Field of Study</FieldLabel>
					<Input
						placeholder="Computer Science"
						value={education.fieldOfStudy}
						onChange={(e) => onUpdate(index, "fieldOfStudy", e.target.value)}
						disabled={disabled}
					/>
				</Field>
				<div className="grid grid-cols-2 gap-4">
					<Field>
						<FieldLabel>Start Date</FieldLabel>
						<Input
							placeholder="Sep 2018"
							value={education.startDate}
							onChange={(e) => onUpdate(index, "startDate", e.target.value)}
							disabled={disabled}
						/>
					</Field>
					<Field>
						<FieldLabel>End Date</FieldLabel>
						<Input
							placeholder="Expected Jun 2022 (leave empty if current)"
							value={education.endDate ?? ""}
							onChange={(e) => onUpdate(index, "endDate", e.target.value || null)}
							disabled={disabled}
						/>
					</Field>
				</div>
				<Field>
					<FieldLabel>Description (Optional)</FieldLabel>
					<Input
						placeholder="GPA, honors, relevant coursework..."
						value={education.description ?? ""}
						onChange={(e) => onUpdate(index, "description", e.target.value || null)}
						disabled={disabled}
					/>
				</Field>
			</CardContent>
		</Card>
	);
}
