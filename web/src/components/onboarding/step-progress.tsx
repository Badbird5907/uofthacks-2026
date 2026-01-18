import React from "react";

interface StepProgressProps {
	currentStep: number;
	totalSteps: number;
	steps: string[];
	onStepClick?: (stepNumber: number) => void;
	maxClickableStep?: number;
}

export function StepProgress({
	currentStep,
	totalSteps,
	steps,
	onStepClick,
	maxClickableStep,
}: StepProgressProps) {
	const handleStepClick = (stepNumber: number) => {
		console.log("handleStepClick", stepNumber, maxClickableStep);
		if (onStepClick && maxClickableStep && stepNumber <= maxClickableStep) {
			onStepClick(stepNumber);
		}
	};

	return (
		<div className="flex items-center gap-1 text-sm text-muted-foreground">
			{steps.map((step, index) => {
				const stepNumber = index + 1;
				const isClickable = maxClickableStep !== undefined && stepNumber <= maxClickableStep;
				const isCurrent = currentStep === stepNumber;

				console.log("Step render:", {
					step,
					stepNumber,
					maxClickableStep,
					isClickable,
					isCurrent,
				});

				return (
					<React.Fragment key={step}>
						{index > 0 && <span key={`arrow-${index}`}>→</span>}
						<span
							key={step}
							onClick={() => {
								console.log("Clicked step:", stepNumber, "isClickable:", isClickable);
								if (isClickable) {
									handleStepClick(stepNumber);
								}
							}}
							className={`
								${isCurrent ? "font-medium text-foreground" : ""}
								${isClickable ? "cursor-pointer hover:text-foreground transition-colors" : ""}
							`.trim()}
						>
							{step}
						</span>
					</React.Fragment>
				);
			})}
		</div>
	);
}
