import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
	icon: LucideIcon;
	message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
	return (
		<div className="rounded-lg border border-dashed p-6 text-center">
			<Icon className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	);
}
