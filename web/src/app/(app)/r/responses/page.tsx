"use client";

import { useState } from "react";
import { ResponseCard } from "@/components/app/response-card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import type { ResponseStatus } from "@/server/api/routers/applicantResponse";

const statusTabs: { value: string; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "pending", label: "Pending" },
	{ value: "reviewed", label: "Reviewed" },
	{ value: "accepted", label: "Accepted" },
	{ value: "rejected", label: "Rejected" },
];

export default function ResponsesPage() {
	const [selectedTab, setSelectedTab] = useState("all");
	const status =
		selectedTab === "all" ? undefined : (selectedTab as ResponseStatus);

	const { data: responses, isLoading } = api.applicantResponse.list.useQuery({
		status,
	});

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Applications</h1>
				<p className="text-muted-foreground">
					Review and manage candidate applications
				</p>
			</div>

			<Tabs value={selectedTab} onValueChange={setSelectedTab}>
				<TabsList>
					{statusTabs.map((tab) => (
						<TabsTrigger key={tab.value} value={tab.value}>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>

				<TabsContent value={selectedTab} className="mt-6">
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Spinner className="size-6" />
						</div>
					) : responses && responses.length > 0 ? (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{responses.map((response) => (
								<ResponseCard
									key={response.id}
									id={response.id}
									candidateName={
										response.candidateProfile.firstName +
										" " +
										response.candidateProfile.lastName
									}
									candidateEmail={response.candidateProfile.user?.email ?? ""}
									jobTitle={response.jobPosting.title}
									status={response.status}
									createdAt={response.createdAt}
								/>
							))}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="rounded-lg border bg-card p-8 max-w-md">
								<h3 className="font-semibold mb-2">No applications yet</h3>
								<p className="text-muted-foreground text-sm">
									{selectedTab === "all"
										? "When candidates apply to your job postings, they will appear here."
										: `No ${selectedTab} applications at the moment.`}
								</p>
							</div>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
