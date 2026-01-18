"use client";

import {
	Briefcase,
	ChevronRight,
	FileText,
	Home,
	Settings,
	User,
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

interface CandidateSidebarProps {
	user: {
		name: string;
		email: string;
		image?: string | null;
	};
}

const navItems = [
	{
		title: "Dashboard",
		url: "/c",
		icon: Home,
	},
	{
		title: "My Profile",
		url: "/c/profile",
		icon: User,
	},
	{
		title: "Applications",
		url: "/c/applications",
		icon: FileText,
		items: [
			{ title: "All Applications", url: "/c/applications" },
			{ title: "Pending", url: "/c/applications/pending" },
			{ title: "Interviews", url: "/c/applications/interviews" },
		],
	},
	{
		title: "Job Search",
		url: "/c/jobs",
		icon: Briefcase,
	},
	{
		title: "Settings",
		url: "/c/settings",
		icon: Settings,
	},
];

export function CandidateSidebar({ user }: CandidateSidebarProps) {
	const pathname = usePathname();

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/c">
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
									<span className="text-lg font-bold">W</span>
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">Wavelength</span>
									<span className="truncate text-xs text-muted-foreground">
										Candidate
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
