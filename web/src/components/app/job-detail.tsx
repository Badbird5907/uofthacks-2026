"use client";

import { Briefcase, Edit2, MapPin, Monitor, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Streamdown } from "streamdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobStatus, JobType, WorkMode } from "@/server/api/routers/jobPosting";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface JobDetailProps {
	job: {
		id: string;
		title: string;
		description: string;
		location: string;
		workMode: string;
		salary: string | null;
		type: string;
		status: string;
		interviewQuestions: string[];
		notes: string | null;
		createdAt: Date;
		updatedAt: Date;
	};
}

const statusColors: Record<JobStatus, "default" | "secondary" | "outline"> = {
	active: "default",
	draft: "secondary",
	closed: "outline",
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

export function JobDetail({ job }: JobDetailProps) {
	const router = useRouter();
	const utils = api.useUtils();

	const deleteJob = api.jobPosting.delete.useMutation({
		onSuccess: () => {
			toast.success("Job posting deleted");
			utils.jobPosting.list.invalidate();
			router.push("/r/jobs");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleDelete = () => {
		if (confirm("Are you sure you want to delete this job posting?")) {
			deleteJob.mutate({ id: job.id });
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-2xl font-bold">{job.title}</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="icon-sm" asChild>
						<Link href={`/r/jobs/${job.id}/edit`}>
							<Edit2 />
						</Link>
					</Button>
					<Button
						variant="destructive"
						size="icon-sm"
						onClick={handleDelete}
						disabled={deleteJob.isPending}
					>
						<Trash2 />
					</Button>
				</div>
			</div>

			<div className="p-3 bg-muted/50 border flex items-center gap-2">
				<Badge variant={statusColors[job.status as JobStatus] ?? "secondary"}>
					{job.status}
				</Badge>
				{job.salary && (
					<Badge variant="outline">
						${job.salary}
					</Badge>
				)}
				<Badge variant="outline">
					<MapPin className="size-3.5" />
					{job.location}
				</Badge>
				<Badge variant="outline">
					<Monitor className="size-3.5" />
					{workModeLabels[job.workMode as WorkMode] ?? job.workMode}
				</Badge>
				<Badge variant="outline">
					<Briefcase className="size-3.5" />
					{jobTypeLabels[job.type as JobType] ?? job.type}
				</Badge>
			</div>

			{/* Description */}
			<div className="space-y-2">
				<div className="prose prose-sm dark:prose-invert max-w-none">
					<Streamdown>{job.description}</Streamdown>
				</div>
			</div>

			{/* Interview Questions */}
			<div className="space-y-2">
				<h2 className="text-sm font-semibold">AI Interview Questions</h2>
				<div className="space-y-2">
					{job.interviewQuestions.map((question, index) => (
						<div
							key={index}
							className="p-3 bg-muted/50 border text-sm"
						>
							<span className="font-medium text-muted-foreground mr-2">
								{index + 1}.
							</span>
							{question}
						</div>
					))}
				</div>
			</div>

			{/* Notes */}
			{job.notes && (
				<div className="space-y-2">
					<h2 className="text-sm font-semibold">Notes for AI Interviewer</h2>
					<div className="p-3 bg-muted/50 border text-sm whitespace-pre-wrap">
						{job.notes}
					</div>
				</div>
			)}

			{/* Metadata */}
			<div className="pt-4 border-t text-xs text-muted-foreground">
				<div>Created: {job.createdAt.toLocaleDateString()}</div>
				<div>Last updated: {job.updatedAt.toLocaleDateString()}</div>
			</div>
		</div>
	);
}
