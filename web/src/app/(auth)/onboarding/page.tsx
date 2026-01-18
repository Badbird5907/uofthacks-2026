import { redirect } from "next/navigation";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getSession } from "@/server/better-auth/server";
import OnboardingClient from "./client";

export const metadata = {
	title: "Complete Your Profile",
};

export type OnboardingStep = 
	| "role" 
	| "resume-upload" 
	| "candidate-profile"
	| "candidate-job-history"
	| "candidate-education"
	| "recruiter-org-choice"
	| "create-org"
	| "join-org";

export default async function OnboardingPage() {
	const session = await getSession();

	// If not logged in, redirect to sign-in
	if (!session) {
		redirect("/auth/sign-in");
	}

	const onboardingStatus = await getOnboardingStatus(session.user);

	if (onboardingStatus.isComplete) {
		redirect("/");
	}

	let step: OnboardingStep;
	if (onboardingStatus.needsRoleSelection) {
		step = "role";
	} else if (onboardingStatus.needsRecruiterOrg) {
		step = "recruiter-org-choice";
	} else if (onboardingStatus.needsCandidateProfile) {
		step = "resume-upload";
	} else {
		step = "candidate-profile";
	}

	return (
		<div className="max-w-2xl w-full mw-auto place-self-center">
 			<OnboardingClient step={step} />
		</div>
	);
}
