import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/server/better-auth/client";
import { toast } from "sonner";

interface RoleSelectionStepProps {
	onNext: (isRecruiter: boolean) => void;
}

export function RoleSelectionStep({ onNext }: RoleSelectionStepProps) {
	const [isRecruiter, setIsRecruiter] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			await authClient.updateUser({
				isRecruiter,
			});
			onNext(isRecruiter);
		} catch (error) {
			toast.error("Failed to update profile. Please try again.");
			setIsLoading(false);
		}
	};

	return (
		<Card className="w-full min-w-full max-w-md">
			<CardHeader>
				<CardTitle>Welcome!</CardTitle>
				<CardDescription>
					Let us know how you'll be using the platform.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-6" onSubmit={handleSubmit}>
					<Field>
						<FieldLabel>I'm a...</FieldLabel>
						<Tabs
							className="w-full"
							onValueChange={(value) => setIsRecruiter(value === "recruiter")}
							value={isRecruiter ? "recruiter" : "candidate"}
						>
							<TabsList className="w-full">
								<TabsTrigger className="flex-1" value="candidate">
									Candidate
								</TabsTrigger>
								<TabsTrigger className="flex-1" value="recruiter">
									Recruiter
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</Field>
					<Button className="w-full" disabled={isLoading} type="submit">
						{isLoading ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : null}
						Continue
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
