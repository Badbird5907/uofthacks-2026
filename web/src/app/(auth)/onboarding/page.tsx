import { redirect } from "next/navigation";
import { getOnboardingStatus } from "@/lib/onboarding";
import { getSession } from "@/server/better-auth/server";
import OnboardingClient from "./client";

export const metadata = {
	title: "Complete Your Profile",
};

export default async function OnboardingPage() {
	const session = await getSession();

	// If not logged in, redirect to sign-in
	if (!session) {
		redirect("/sign-in");
	}

	const onboardingStatus = await getOnboardingStatus(session.user);

	// If onboarding is complete, redirect to home
	if (onboardingStatus.isComplete) {
		redirect("/");
	}

	// Determine the starting step
	let step: "role" | "resume-upload" | "candidate-profile";
	if (onboardingStatus.needsRoleSelection) {
		step = "role";
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
