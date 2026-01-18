"use client";

import { Briefcase, Calendar, DollarSign, MapPin, MessageSquare, Monitor } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobStatus, JobType, WorkMode } from "@/server/api/routers/jobPosting";

interface JobCardProps {
	id: string;
	title: string;
	description: string;
	location: string;
	workMode: string;
	type: string;
	status: string;
	salary?: string | null;
	interviewQuestions?: string[];
	createdAt?: Date;
	updatedAt?: Date;
	basePath?: string;
}

const statusColors: Record<JobStatus, "default" | "secondary" | "outline"> = {
	active: "default",
	draft: "secondary",
	closed: "outline",
};

const statusLabels: Record<JobStatus, string> = {
	active: "Active",
	draft: "Draft",
	closed: "Closed",
};

const workModeLabels: Record<WorkMode, string> = {
	remote: "Remote",
	hybrid: "Hybrid",
	"on-site": "On-site",
};

const jobTypeLabels: Record<JobType, string> = {
	"full-time": "Full-time",
	"part-time": "Part-time",
	contract: "Contract",
	internship: "Internship",
};

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) return "just now";
	if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
	if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
	if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
	if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function stripMarkdown(markdown: string): string {
	return markdown
		.replace(/#{1,6}\s+/g, "") // Remove headers
		.replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
		.replace(/\*(.+?)\*/g, "$1") // Remove italic
		.replace(/\[(.+?)\]\(.+?\)/g, "$1") // Remove links
		.replace(/`(.+?)`/g, "$1") // Remove inline code
		.replace(/\n+/g, " ") // Replace newlines with spaces
		.trim();
}

export function JobCard({
	id,
	title,
	description,
	location,
	workMode,
	type,
	status,
	salary,
	interviewQuestions = [],
	updatedAt,
	basePath = "/r/jobs",
}: JobCardProps) {
	const plainDescription = stripMarkdown(description);
	const truncatedDescription =
		plainDescription.length > 120
			? `${plainDescription.slice(0, 120)}...`
			: plainDescription;

	return (
		<Link href={`${basePath}/${id}`}>
			<Card className="hover:shadow-lg hover:border-foreground/20 transition-all cursor-pointer h-full flex flex-col group">
				<CardHeader className="space-y-3">
					<div className="flex items-start justify-between gap-3">
						<CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
							{title}
						</CardTitle>
						<Badge
							variant={statusColors[status as JobStatus] ?? "secondary"}
							className="shrink-0"
						>
							{statusLabels[status as JobStatus] ?? status}
						</Badge>
					</div>
					{truncatedDescription && (
						<p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
							{truncatedDescription}
						</p>
					)}
				</CardHeader>

				<CardContent className="grid grid-cols-2">
					<div className="space-y-2.5 col-span-1">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<MapPin className="size-4 shrink-0" />
							<span className="truncate">{location}</span>
						</div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Monitor className="size-4 shrink-0" />
							<span>{workModeLabels[workMode as WorkMode] ?? workMode}</span>
						</div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Briefcase className="size-4 shrink-0" />
							<span>{jobTypeLabels[type as JobType] ?? type}</span>
						</div>
					</div>
					{salary && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground col-span-1 justify-end">
							<DollarSign className="size-4 shrink-0" />
							<span>{salary}</span>
						</div>
					)}
				</CardContent>

				<CardFooter className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
					<div className="flex items-center gap-1.5">
						<MessageSquare className="size-3.5" />
						<span>
							{interviewQuestions.length}{" "}
							{interviewQuestions.length === 1 ? "question" : "questions"}
						</span>
					</div>
					{updatedAt && (
						<div className="flex items-center gap-1.5">
							<Calendar className="size-3.5" />
							<span>{formatRelativeTime(new Date(updatedAt))}</span>
						</div>
					)}
				</CardFooter>
			</Card>
		</Link>
	);
}
