"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import type { EducationItem, JobHistoryItem, ParsedResumeData } from "@/server/api/routers/onboarding";
import { CreateOrgStep } from "@/components/onboarding/steps/create-org-step";
import { EducationStep } from "@/components/onboarding/steps/education-step";
import { JobHistoryStep } from "@/components/onboarding/steps/job-history-step";
import { JoinOrgStep } from "@/components/onboarding/steps/join-org-step";
import { ProfileInfoStep, type ProfileData } from "@/components/onboarding/steps/profile-info-step";
import { RecruiterOrgChoiceStep } from "@/components/onboarding/steps/recruiter-org-choice-step";
import { ResumeUploadStep } from "@/components/onboarding/steps/resume-upload-step";
import { RoleSelectionStep } from "@/components/onboarding/steps/role-selection-step";
import type { OnboardingStep } from "./page";

interface OnboardingClientProps {
	step: OnboardingStep;
}

export default function OnboardingClient({
	step: initialStep,
}: OnboardingClientProps) {
	const router = useRouter();
	const [currentStep, setCurrentStep] =
		React.useState<OnboardingStep>(initialStep);
	const [resumeUrl, setResumeUrl] = React.useState<string>("");
	const [parsedData, setParsedData] = React.useState<ParsedResumeData | null>(
		null,
	);
	const [profileData, setProfileData] = React.useState<ProfileData | null>(null);
	const [jobHistoryItems, setJobHistoryItems] = React.useState<JobHistoryItem[]>([]);
	const [educationItems, setEducationItems] = React.useState<EducationItem[]>([]);
	const [canGoBackToRole, setCanGoBackToRole] = React.useState(initialStep === "role");
	const [maxCompletedStep, setMaxCompletedStep] = React.useState(1);

	const handleSuccess = () => {
		router.push("/");
		router.refresh();
	};

	const handleStepClick = (stepNumber: number) => {
		console.log("handleStepClick called:", { stepNumber, currentStep, maxCompletedStep });
		if (stepNumber === 1) {
			setCurrentStep("candidate-profile");
		} else if (stepNumber === 2) {
			setCurrentStep("candidate-job-history");
		} else if (stepNumber === 3) {
			setCurrentStep("candidate-education");
		}
	};

	// Helper function to get the numeric step
	const getCurrentStepNumber = (): number => {
		if (currentStep === "candidate-profile") return 1;
		if (currentStep === "candidate-job-history") return 2;
		if (currentStep === "candidate-education") return 3;
		return 1;
	};

	// Update maxCompletedStep whenever we're on a step
	React.useEffect(() => {
		const stepNumber = getCurrentStepNumber();
		if (stepNumber > 0) {
			setMaxCompletedStep((prev) => Math.max(prev, stepNumber));
		}
	}, [currentStep]);

	if (currentStep === "role") {
		return (
			<RoleSelectionStep
				onNext={(isRecruiter) => {
					if (isRecruiter) {
						setCanGoBackToRole(true);
						setCurrentStep("recruiter-org-choice");
					} else {
						setCanGoBackToRole(true);
						setCurrentStep("resume-upload");
					}
				}}
			/>
		);
	}

	if (currentStep === "recruiter-org-choice") {
		return (
			<RecruiterOrgChoiceStep
				onBack={canGoBackToRole ? () => setCurrentStep("role") : undefined}
				onCreateOrg={() => setCurrentStep("create-org")}
				onJoinOrg={() => setCurrentStep("join-org")}
			/>
		);
	}

	if (currentStep === "create-org") {
		return (
			<CreateOrgStep
				onBack={() => setCurrentStep("recruiter-org-choice")}
				onSuccess={handleSuccess}
			/>
		);
	}

	if (currentStep === "join-org") {
		return (
			<JoinOrgStep
				onBack={() => setCurrentStep("recruiter-org-choice")}
				onSuccess={handleSuccess}
			/>
		);
	}

	if (currentStep === "resume-upload") {
		return (
			<ResumeUploadStep
				onBack={canGoBackToRole ? () => setCurrentStep("role") : undefined}
				onNext={(url, data) => {
					setResumeUrl(url);
					setParsedData(data);
					if (data?.jobHistory) {
						setJobHistoryItems(data.jobHistory);
					}
					if (data?.education) {
						setEducationItems(data.education);
					}
					setCurrentStep("candidate-profile");
				}}
				onSkip={() => {
					setCurrentStep("candidate-profile");
				}}
			/>
		);
	}

	if (currentStep === "candidate-profile") {
		return (
			<ProfileInfoStep
				initialData={parsedData}
				resumeUrl={resumeUrl}
				savedData={profileData}
				onBack={() => {
					setResumeUrl("");
					setParsedData(null);
					setProfileData(null);
					setJobHistoryItems([]);
					setEducationItems([]);
					setCurrentStep("resume-upload");
				}}
				onNext={(data) => {
					setProfileData(data);
					setMaxCompletedStep(Math.max(maxCompletedStep, 2));
					setCurrentStep("candidate-job-history");
				}}
				onStepClick={handleStepClick}
				maxClickableStep={maxCompletedStep}
			/>
		);
	}

	if (currentStep === "candidate-job-history") {
		return (
			<JobHistoryStep
				initialData={jobHistoryItems}
				onBack={() => setCurrentStep("candidate-profile")}
				onNext={(items) => {
					setJobHistoryItems(items);
					setMaxCompletedStep(Math.max(maxCompletedStep, 3));
					setCurrentStep("candidate-education");
				}}
				onStepClick={handleStepClick}
				maxClickableStep={maxCompletedStep}
			/>
		);
	}

	if (currentStep === "candidate-education") {
		console.log("Rendering education step with maxCompletedStep:", maxCompletedStep);
		return (
			<EducationStep
				initialData={educationItems}
				profileData={profileData!}
				jobHistoryItems={jobHistoryItems}
				onBack={() => setCurrentStep("candidate-job-history")}
				onSuccess={handleSuccess}
				onStepClick={handleStepClick}
				maxClickableStep={maxCompletedStep}
			/>
		);
	}

	return null;
}
