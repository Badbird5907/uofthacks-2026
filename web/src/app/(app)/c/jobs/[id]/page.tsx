"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useMemo, useState } from "react";
import { JobDetail } from "@/components/app/job-detail";
import { JobSidebarList } from "@/components/app/job-sidebar-list";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/trpc/react";

export default function CandidateJobDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);

	const { data: jobs, isLoading: isLoadingJobs } = api.jobPosting.listAll.useQuery();
	const { data: job, isLoading: isLoadingJob } = api.jobPosting.getByIdPublic.useQuery(
		{ id },
		{ enabled: !!id },
	);

	if (isLoadingJobs || isLoadingJob) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-6" />
			</div>
		);
	}

	if (!job) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<p className="text-muted-foreground mb-4">Job posting not found</p>
				<Button asChild variant="outline">
					<Link href="/c/jobs">
						<ArrowLeft className="mr-1.5" />
						Back to Jobs
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex gap-6 h-screen p-4">
			{/* Sidebar */}
			<div className="w-72 shrink-0 flex flex-col border-r -ml-4 -mt-4 -mb-4 pr-0">
				<div className="p-4 border-b">
					<Link
						href="/c/jobs"
						className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
					>
						<ArrowLeft className="size-3.5" />
						All Jobs
					</Link>
				</div>
				<div className="flex-1 overflow-y-auto">
					<JobSidebarList
						jobs={
							jobs?.map((j) => ({
								id: j.id,
								title: j.title,
								status: j.status,
								location: j.location,
							})) ?? []
						}
						selectedId={id}
						basePath="/c/jobs"
					/>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 overflow-y-auto pr-2">
				<JobDetail
					job={job}
					showActions={true}
					actionButtons={
						<div className="flex items-center gap-2 self-center">
							<Link href={`/c/jobs/${id}/apply`} target="_blank">
								<Button size="lg">Apply Now</Button>
							</Link>
						</div>
					}
				/>
			</div>
		</div>
	);
}
