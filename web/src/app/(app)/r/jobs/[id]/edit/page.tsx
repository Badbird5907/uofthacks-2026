"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { JobForm } from "@/components/app/job-form";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/trpc/react";

export default function EditJobPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	
	const { data: job, isLoading } = api.jobPosting.getById.useQuery(
		{ id },
		{ enabled: !!id }
	);

	if (isLoading) {
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
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Edit Job Posting</h1>
				<p className="text-muted-foreground">
					Update the details of your job posting
				</p>
			</div>

			<JobForm mode="edit" initialData={job} />
		</div>
	);
}
