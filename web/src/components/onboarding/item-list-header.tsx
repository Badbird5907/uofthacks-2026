import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldLabel } from "@/components/ui/field";

interface ItemListHeaderProps {
	label: string;
	description: string;
	buttonLabel?: string;
	onAdd: () => void;
	disabled?: boolean;
}

export function ItemListHeader({
	label,
	description,
	buttonLabel = "Add",
	onAdd,
	disabled = false,
}: ItemListHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<FieldLabel>{label}</FieldLabel>
				<FieldDescription>{description}</FieldDescription>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={onAdd}
				disabled={disabled}
			>
				<Plus className="mr-1 h-4 w-4" />
				{buttonLabel}
			</Button>
		</div>
	);
}
