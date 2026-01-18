"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { JobCard } from "@/components/app/job-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/trpc/react";
import { useMemo } from "react";

export default function JobsPage() {
	const { data: jobs, isLoading } = api.jobPosting.list.useQuery();
	const sortedJobs = useMemo(() => {
		if (!jobs) return [];
		const active = jobs.filter((job) => job.status === "active");
		const draft = jobs.filter((job) => job.status === "draft");
		return [...draft.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), ...active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())];
	}, [jobs]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-6" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Job Postings</h1>
					<p className="text-muted-foreground">
						Manage your organization's job listings
					</p>
				</div>
				<Button asChild>
					<Link href="/r/jobs/new">
						<Plus className="mr-1.5" />
						Create Job
					</Link>
				</Button>
			</div>

			{jobs && jobs.length > 0 ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{sortedJobs.map((job) => (
						<JobCard
							key={job.id}
							id={job.id}
							title={job.title}
							description={job.description}
							location={job.location}
							workMode={job.workMode}
							type={job.type}
							status={job.status}
							salary={job.salary}
							interviewQuestions={job.interviewQuestions}
							createdAt={job.createdAt}
							updatedAt={job.updatedAt}
						/>
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<div className="rounded-lg border bg-card p-8 max-w-md">
						<h3 className="font-semibold mb-2">No job postings yet</h3>
						<p className="text-muted-foreground text-sm mb-4">
							Create your first job posting to start receiving applications
						</p>
						<Button asChild>
							<Link href="/r/jobs/new">
								<Plus className="mr-1.5" />
								Create Job
							</Link>
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
