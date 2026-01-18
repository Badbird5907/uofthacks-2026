import * as React from "react";
import { Loader2 } from "lucide-react";
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
import { CodeInput } from "../code-input";
import { api } from "@/trpc/react";

interface JoinOrgStepProps {
	onBack: () => void;
	onSuccess: () => void;
}

export function JoinOrgStep({ onBack, onSuccess }: JoinOrgStepProps) {
	const [code, setCode] = React.useState("");
	const [isLoading, setIsLoading] = React.useState(false);

	const joinOrg = api.organization.joinWithCode.useMutation({
		onSuccess: () => {
			onSuccess();
		},
		onError: (error) => {
			toast.error(error.message || "Invalid code. Please try again.");
			setIsLoading(false);
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (code.length !== 4) {
			toast.error("Please enter a valid 4-digit code");
			return;
		}
		setIsLoading(true);
		joinOrg.mutate({ code });
	};

	return (
		<Card className="w-full min-w-full max-w-md">
			<CardHeader>
				<BackButton onClick={onBack} disabled={isLoading} />
				<CardTitle>Join Organization</CardTitle>
				<CardDescription>
					Enter the 4-digit code from your organization admin.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-6" onSubmit={handleSubmit}>
					<CodeInput code={code} onChange={setCode} disabled={isLoading} />
					<Button
						className="w-full"
						disabled={isLoading || code.length !== 4}
						type="submit"
					>
						{isLoading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : null}
						Join Organization
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
