"use client";

import {
	Building2,
	ChevronRight,
	Files,
	FileText,
	Home,
	Settings,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavUser } from "@/components/app/nav-user";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";

interface RecruiterSidebarProps {
	user: {
		name: string;
		email: string;
		image?: string | null;
	};
	org: {
		id: string;
		name: string;
	}
}

const navItems = [
	{
		title: "Dashboard",
		url: "/r",
		icon: Home,
	},
	{
		title: "Candidates",
		url: "/r/candidates",
		icon: Users,
		items: [
			{ title: "All Candidates", url: "/r/candidates" },
			{ title: "Shortlisted", url: "/r/candidates/shortlisted" },
			{ title: "Interviews", url: "/r/candidates/interviews" },
		],
	},
	{
		title: "Job Postings",
		url: "/r/jobs",
		icon: Files,
	},
	{
		title: "Organization",
		url: "/r/organization",
		icon: Building2,
	},
	{
		title: "Settings",
		url: "/r/settings",
		icon: Settings,
	},
];

export function RecruiterSidebar({ user, org }: RecruiterSidebarProps) {
	const pathname = usePathname();

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/r">
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
									<span className="text-lg font-bold">W</span>
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">Wavelength</span>
									<span className="truncate text-xs text-muted-foreground">
										Recruiter {org.name && `• ${org.name}`}
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navItems.map((item) =>
								item.items ? (
									<Collapsible
										key={item.title}
										asChild
										defaultOpen={pathname.startsWith(item.url)}
										className="group/collapsible"
									>
										<SidebarMenuItem>
											<CollapsibleTrigger asChild>
												<SidebarMenuButton
													tooltip={item.title}
													isActive={pathname === item.url}
												>
													<item.icon />
													<span>{item.title}</span>
													<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
												</SidebarMenuButton>
											</CollapsibleTrigger>
											<CollapsibleContent>
												<SidebarMenuSub>
													{item.items.map((subItem) => (
														<SidebarMenuSubItem key={subItem.title}>
															<SidebarMenuSubButton
																asChild
																isActive={pathname === subItem.url}
															>
																<Link href={subItem.url}>
																	<span>{subItem.title}</span>
																</Link>
															</SidebarMenuSubButton>
														</SidebarMenuSubItem>
													))}
												</SidebarMenuSub>
											</CollapsibleContent>
										</SidebarMenuItem>
									</Collapsible>
								) : (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											asChild
											tooltip={item.title}
											isActive={pathname === item.url}
										>
											<Link href={item.url}>
												<item.icon />
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								),
							)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
		</Sidebar>
	);
}
