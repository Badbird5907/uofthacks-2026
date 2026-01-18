import { Building2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { BackButton } from "../back-button";

interface RecruiterOrgChoiceStepProps {
	onBack?: () => void;
	onCreateOrg: () => void;
	onJoinOrg: () => void;
}

export function RecruiterOrgChoiceStep({
	onBack,
	onCreateOrg,
	onJoinOrg,
}: RecruiterOrgChoiceStepProps) {
	return (
		<Card className="w-full min-w-full max-w-md">
			<CardHeader>
				{onBack && <BackButton onClick={onBack} />}
				<CardTitle>Set Up Your Organization</CardTitle>
				<CardDescription>
					Create a new organization or join an existing one with a code from your
					team.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Button
					variant="outline"
					className="w-full h-auto p-4 flex items-start gap-4 justify-start"
					onClick={onCreateOrg}
				>
					<div className="rounded-full bg-primary/10 p-2">
						<Building2 className="h-5 w-5 text-primary" />
					</div>
					<div className="text-left">
						<div className="font-medium">Create Organization</div>
						<div className="text-sm text-muted-foreground font-normal">
							Start fresh and invite your team later
						</div>
					</div>
				</Button>
				<Button
					variant="outline"
					className="w-full h-auto p-4 flex items-start gap-4 justify-start"
					onClick={onJoinOrg}
				>
					<div className="rounded-full bg-primary/10 p-2">
						<UserPlus className="h-5 w-5 text-primary" />
					</div>
					<div className="text-left">
						<div className="font-medium">Join Organization</div>
						<div className="text-sm text-muted-foreground font-normal">
							Enter a 4-digit code from your team
						</div>
					</div>
				</Button>
			</CardContent>
		</Card>
	);
}
