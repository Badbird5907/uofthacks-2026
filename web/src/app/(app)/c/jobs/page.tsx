"use client";

import { Search } from "lucide-react";
import { JobCard } from "@/components/app/job-card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/trpc/react";
import { useMemo, useState } from "react";

export default function CandidateJobsPage() {
	const { data: jobs, isLoading } = api.jobPosting.listAll.useQuery();
	const [searchQuery, setSearchQuery] = useState("");

	const filteredJobs = useMemo(() => {
		if (!jobs) return [];
		if (!searchQuery.trim()) return jobs;

		const query = searchQuery.toLowerCase();
		return jobs.filter(
			(job) =>
				job.title.toLowerCase().includes(query) ||
				job.description.toLowerCase().includes(query) ||
				job.location.toLowerCase().includes(query) ||
				job.organization?.name.toLowerCase().includes(query),
		);
	}, [jobs, searchQuery]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-6" />
			</div>
		);
	}

	return (
		<div className="space-y-6 p-4">
			<div className="space-y-4">
				<div>
					<h1 className="text-2xl font-bold">Browse Jobs</h1>
					<p className="text-muted-foreground">
						Explore available opportunities and find your next role
					</p>
				</div>

				<div className="relative max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						placeholder="Search jobs by title, company, or location..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>

			{filteredJobs.length > 0 ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredJobs.map((job) => (
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
							basePath="/c/jobs"
						/>
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<div className="rounded-lg border bg-card p-8 max-w-md">
						<h3 className="font-semibold mb-2">
							{searchQuery ? "No jobs found" : "No active jobs"}
						</h3>
						<p className="text-muted-foreground text-sm">
							{searchQuery
								? "Try adjusting your search terms to find what you're looking for"
								: "Check back later for new opportunities"}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
