"use client";

import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { use,useMemo } from "react";
import { JobDetail } from "@/components/app/job-detail";
import { JobSidebarList } from "@/components/app/job-sidebar-list";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/trpc/react";

export default function JobDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	
	const { data: jobs, isLoading: isLoadingJobs } = api.jobPosting.list.useQuery();
	const { data: job, isLoading: isLoadingJob } = api.jobPosting.getById.useQuery(
		{ id },
		{ enabled: !!id }
	);
	
	const sortedJobs = useMemo(() => {
		if (!jobs) return [];
		const active = jobs.filter((job) => job.status === "active");
		const draft = jobs.filter((job) => job.status === "draft");
		return [...draft.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), ...active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())];
	}, [jobs]);

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
					<Link href="/r/jobs">
						<ArrowLeft className="mr-1.5" />
						Back to Jobs
					</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex gap-6 h-[calc(100vh-8rem)]">
			{/* Sidebar */}
			<div className="w-72 shrink-0 flex flex-col border-r -ml-4 -mt-4 -mb-4 pr-0">
				<div className="p-4 border-b flex items-center justify-between">
					<Link
						href="/r/jobs"
						className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
					>
						<ArrowLeft className="size-3.5" />
						All Jobs
					</Link>
					<Button asChild size="icon-sm" variant="outline">
						<Link href="/r/jobs/new">
							<Plus />
						</Link>
					</Button>
				</div>
				<div className="flex-1 overflow-y-auto">
					<JobSidebarList
						jobs={
							sortedJobs?.map((j) => ({
								id: j.id,
								title: j.title,
								status: j.status,
								location: j.location,
							})) ?? []
						}
						selectedId={id}
					/>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 overflow-y-auto pr-2">
				<JobDetail job={job} />
			</div>
		</div>
	);
}
