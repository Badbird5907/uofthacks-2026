import { redirect } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RecruiterSidebar } from "@/components/app/recruiter-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getSession } from "@/server/better-auth/server";
import { getOnboardingStatus } from "@/lib/onboarding";
import { db } from "@/server/db";
import { organizationMembers } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export default async function RecruiterLayout({
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

	// Redirect candidates to the candidate section
	if (!session.user.isRecruiter) {
		redirect("/c");
	}
	const org = await db.query.organizationMembers.findFirst({
		where: eq(organizationMembers.userId, session.user.id),
		with: {
			organization: true,
		},
	});

	if (!org || !org.organization) {
		redirect("/onboarding");
	}

	return (
		<TooltipProvider>
			<SidebarProvider>
				<RecruiterSidebar
					user={{
						name: session.user.name,
						email: session.user.email,
						image: session.user.image,
					}}
					org={org.organization}
				/>
				<SidebarInset>
					<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
						<SidebarTrigger className="-ml-1" />
					</header>
					<div className="flex flex-1 flex-col gap-4 p-4">
						{children}
					</div>
				</SidebarInset>
			</SidebarProvider>
		</TooltipProvider>
	);
}
