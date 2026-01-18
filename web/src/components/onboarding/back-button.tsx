import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
	onClick: () => void;
	disabled?: boolean;
	className?: string;
}

export function BackButton({ onClick, disabled, className }: BackButtonProps) {
	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={onClick}
			disabled={disabled}
			className={`w-fit -ml-2 mb-2 text-muted-foreground ${className ?? ""}`}
		>
			<ArrowLeft className="mr-1 h-4 w-4" />
			Back
		</Button>
	);
}
