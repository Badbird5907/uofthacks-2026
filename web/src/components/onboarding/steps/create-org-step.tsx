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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BackButton } from "../back-button";
import { api } from "@/trpc/react";

interface CreateOrgStepProps {
	onBack: () => void;
	onSuccess: () => void;
}

export function CreateOrgStep({ onBack, onSuccess }: CreateOrgStepProps) {
	const [orgName, setOrgName] = React.useState("");
	const [isLoading, setIsLoading] = React.useState(false);

	const createOrg = api.organization.create.useMutation({
		onSuccess: () => {
			onSuccess();
		},
		onError: (error) => {
			toast.error(
				error.message || "Failed to create organization. Please try again.",
			);
			setIsLoading(false);
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!orgName.trim()) {
			toast.error("Please enter an organization name");
			return;
		}
		setIsLoading(true);
		createOrg.mutate({ name: orgName.trim() });
	};

	return (
		<Card className="w-full min-w-full max-w-md">
			<CardHeader>
				<BackButton onClick={onBack} disabled={isLoading} />
				<CardTitle>Create Organization</CardTitle>
				<CardDescription>
					Enter a name for your organization. You can invite team members later.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<Field>
						<FieldLabel>Organization Name</FieldLabel>
						<Input
							placeholder="Acme Inc."
							value={orgName}
							onChange={(e) => setOrgName(e.target.value)}
							disabled={isLoading}
						/>
					</Field>
					<Button
						className="w-full"
						disabled={isLoading || !orgName.trim()}
						type="submit"
					>
						{isLoading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : null}
						Create Organization
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
