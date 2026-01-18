"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/server/api/routers/jobPosting";

interface JobListItem {
	id: string;
	title: string;
	status: string;
	location: string;
}

interface JobSidebarListProps {
	jobs: JobListItem[];
	selectedId: string;
}

const statusColors: Record<JobStatus, "default" | "secondary" | "outline"> = {
	active: "default",
	draft: "secondary",
	closed: "outline",
};

export function JobSidebarList({ jobs, selectedId }: JobSidebarListProps) {
	return (
		<div className="flex flex-col gap-1 overflow-y-auto">
			{jobs.map((job) => (
				<Link
					key={job.id}
					href={`/r/jobs/${job.id}`}
					className={cn(
						"flex flex-col gap-1 p-3 border transition-colors",
						job.id === selectedId
							? "bg-muted border-foreground/20"
							: "hover:bg-muted/50 border-transparent"
					)}
				>
					<div className="flex items-start justify-between gap-2">
						<span className="font-medium text-sm line-clamp-1">{job.title}</span>
						<Badge
							variant={statusColors[job.status as JobStatus] ?? "secondary"}
							className="shrink-0"
						>
							{job.status}
						</Badge>
					</div>
					<span className="text-xs text-muted-foreground line-clamp-1">
						{job.location}
					</span>
				</Link>
			))}
			{jobs.length === 0 && (
				<div className="p-4 text-center text-muted-foreground text-sm">
					No job postings yet
				</div>
			)}
		</div>
	);
}
