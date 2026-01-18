import { redirect } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CandidateSidebar } from "@/components/app/candidate-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getSession } from "@/server/better-auth/server";
import { getOnboardingStatus } from "@/lib/onboarding";

export default async function CandidateLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getSession();

	if (!session) {
		redirect("/auth/sign-in");
	}

	const onboardingStatus = await getOnboardingStatus(session.user);

	if (!onboardingStatus.isComplete) {
		redirect("/onboarding");
	}

	// Redirect recruiters to the recruiter section
	if (session.user.isRecruiter) {
		redirect("/r");
	}

	return (
		<TooltipProvider>
			<SidebarProvider>
				<CandidateSidebar
					user={{
						name: session.user.name,
						email: session.user.email,
						image: session.user.image,
					}}
				/>
				<SidebarInset>
					{/* <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
						<SidebarTrigger className="-ml-1" />
					</header> */}
					<div className="flex flex-1 flex-col gap-4">
						{children}
					</div>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}
