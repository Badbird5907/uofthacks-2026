"use client";

import { Calendar, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { ResponseStatus } from "@/server/api/routers/applicantResponse";

interface ResponseCardProps {
	id: string;
	candidateName: string;
	candidateEmail: string;
	jobTitle: string;
	status: string;
	createdAt: Date;
}

const statusColors: Record<
	ResponseStatus,
	"default" | "secondary" | "outline" | "destructive"
> = {
	pending: "secondary",
	reviewed: "outline",
	accepted: "default",
	rejected: "destructive",
};

const statusLabels: Record<ResponseStatus, string> = {
	pending: "Pending",
	reviewed: "Reviewed",
	accepted: "Accepted",
	rejected: "Rejected",
};

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) return "just now";
	if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
	if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
	if (diffInSeconds < 604800)
		return `${Math.floor(diffInSeconds / 86400)}d ago`;
	if (diffInSeconds < 2592000)
		return `${Math.floor(diffInSeconds / 604800)}w ago`;
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ResponseCard({
	id,
	candidateName,
	candidateEmail,
	jobTitle,
	status,
	createdAt,
}: ResponseCardProps) {
	return (
		<Link href={`/r/responses/${id}`}>
			<Card className="hover:shadow-lg hover:border-foreground/20 transition-all cursor-pointer h-full flex flex-col group">
				<CardHeader className="space-y-3">
					<div className="flex items-start justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-full bg-muted">
								<User className="size-5 text-muted-foreground" />
							</div>
							<div>
								<CardTitle className="text-lg group-hover:text-primary transition-colors">
									{candidateName}
								</CardTitle>
								<p className="text-sm text-muted-foreground">{candidateEmail}</p>
							</div>
						</div>
						<Badge
							variant={statusColors[status as ResponseStatus] ?? "secondary"}
							className="shrink-0"
						>
							{statusLabels[status as ResponseStatus] ?? status}
						</Badge>
					</div>
				</CardHeader>

				<CardContent>
					<div className="text-sm text-muted-foreground">
						Applied for{" "}
						<span className="font-medium text-foreground">{jobTitle}</span>
					</div>
				</CardContent>

				<CardFooter className="flex items-center text-xs text-muted-foreground border-t pt-3 mt-auto">
					<div className="flex items-center gap-1.5">
						<Calendar className="size-3.5" />
						<span>{formatRelativeTime(new Date(createdAt))}</span>
					</div>
				</CardFooter>
			</Card>
		</Link>
	);
}
