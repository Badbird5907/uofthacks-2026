"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
	AlertTriangle,
	ArrowLeft,
	Briefcase,
	Calendar,
	ExternalLink,
	Github,
	Linkedin,
	Loader2,
	Mail,
	MapPin,
	Phone,
	Twitter,
	Globe,
	FileText,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import type { ResponseStatus } from "@/server/api/routers/applicantResponse";
import type { ScrapedCandidateInfo } from "@/lib/scraper/types";
import type { VideoAnalysisResult } from "@/app/api/analyze-video/route";
import { Streamdown } from "streamdown";

interface PageProps {
	params: Promise<{ id: string }>;
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

function getInitials(firstName: string, lastName: string): string {
	return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function ResponseDetailPage({ params }: PageProps) {
	const { id } = use(params);
	const [selectedTab, setSelectedTab] = useState("profile");
	const [showAllExperience, setShowAllExperience] = useState(false);

	// Fetch response data
	const {
		data: response,
		isLoading,
		error,
	} = api.applicantResponse.getById.useQuery({ id });

	const utils = api.useUtils();
	const updateStatusMutation = api.applicantResponse.updateStatus.useMutation({
		onSuccess: () => {
			utils.applicantResponse.getById.invalidate({ id });
			utils.applicantResponse.list.invalidate();
		},
	});

	// Scraper state
	const [scraperData, setScraperData] = useState<ScrapedCandidateInfo | null>(
		null
	);
	const [scraperStatus, setScraperStatus] = useState<
		"idle" | "processing" | "complete" | "error"
	>("idle");
	const [scraperError, setScraperError] = useState<string | null>(null);

	// Video analysis state
	const [videoAnalysis, setVideoAnalysis] =
		useState<VideoAnalysisResult | null>(null);
	const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
	const [analysisError, setAnalysisError] = useState<string | null>(null);
	const [hasAttemptedVideoFetch, setHasAttemptedVideoFetch] = useState(false);

	// Fetch scraper data on mount
	useEffect(() => {
		if (response?.candidateProfile.id && scraperStatus === "idle") {
			fetchScraperData();
		}
	}, [response?.candidateProfile.id]);

	// Poll every 10s if processing
	useEffect(() => {
		if (scraperStatus === "processing") {
			const interval = setInterval(fetchScraperData, 10000);
			return () => clearInterval(interval);
		}
	}, [scraperStatus]);

	// Fetch video analysis when tab becomes active
	useEffect(() => {
		if (
			selectedTab === "video" &&
			!hasAttemptedVideoFetch &&
			response?.recordingUrl
		) {
			fetchVideoAnalysis();
		}
	}, [selectedTab, hasAttemptedVideoFetch, response?.recordingUrl]);

	async function fetchScraperData() {
		if (!response?.candidateProfile.id) return;

		try {
			if (scraperStatus === "idle") {
				setScraperStatus("processing");
			}

			const res = await fetch("/api/process-profile", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ candidateId: response.candidateProfile.id }),
			});

			if (!res.ok) {
				throw new Error("Failed to process profile");
			}

			const data = await res.json();

			if (data.status === "complete") {
				setScraperData(data.result);
				setScraperStatus("complete");
			} else {
				setScraperStatus("processing");
			}
		} catch (err) {
			setScraperStatus("error");
			setScraperError(
				err instanceof Error ? err.message : "Failed to process profile"
			);
		}
	}

	async function fetchVideoAnalysis() {
		if (!response?.recordingUrl) return;

		try {
			setHasAttemptedVideoFetch(true);
			setIsLoadingAnalysis(true);
			setAnalysisError(null);

			const res = await fetch("/api/analyze-video", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ video_url: response.recordingUrl }),
			});

			if (!res.ok) {
				throw new Error("Failed to analyze video");
			}

			const data = await res.json();
			setVideoAnalysis(data);
		} catch (err) {
			setAnalysisError(
				err instanceof Error ? err.message : "Failed to analyze video"
			);
		} finally {
			setIsLoadingAnalysis(false);
		}
	}

	function handleUpdateStatus(status: ResponseStatus) {
		updateStatusMutation.mutate({ id, status });
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-6" />
			</div>
		);
	}

	if (error || !response) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<Alert variant="destructive" className="max-w-md">
					<AlertTriangle className="size-4" />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>
						{error?.message ?? "Response not found"}
					</AlertDescription>
				</Alert>
				<Button asChild variant="outline" className="mt-4">
					<Link href="/r/responses">
						<ArrowLeft className="mr-2 size-4" />
						Back to Applications
					</Link>
				</Button>
			</div>
		);
	}

	const { candidateProfile: candidate, jobPosting: job } = response;

	return (
		<div className="space-y-6">
			{/* Back button */}
			<Button asChild variant="ghost" size="sm" className="-ml-2">
				<Link href="/r/responses">
					<ArrowLeft className="mr-2 size-4" />
					Back to Applications
				</Link>
			</Button>

			{/* Header */}
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold">
						{candidate.firstName} {candidate.lastName}
					</h1>
					<p className="text-muted-foreground">{candidate.user?.email}</p>
				</div>
				<div className="flex items-center gap-3">
					<Badge
						variant={statusColors[response.status as ResponseStatus]}
						className="text-sm"
					>
						{statusLabels[response.status as ResponseStatus] ?? response.status}
					</Badge>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								disabled={updateStatusMutation.isPending}
							>
								{updateStatusMutation.isPending ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : null}
								Update Status
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => handleUpdateStatus("pending")}>
								Mark as Pending
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleUpdateStatus("reviewed")}>
								Mark as Reviewed
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleUpdateStatus("accepted")}>
								Accept
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleUpdateStatus("rejected")}>
								Reject
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Main content */}
			<div className="grid gap-6 lg:grid-cols-[300px_1fr]">
				{/* Sidebar */}
				<div className="space-y-4">
					{/* Profile Card */}
					<Card>
						<CardHeader className="pb-3">
							<div className="flex items-center gap-3">
								<Avatar size="lg">
									{candidate.user?.image ? (
										<AvatarImage src={candidate.user.image} />
									) : null}
									<AvatarFallback>
										{getInitials(candidate.firstName, candidate.lastName)}
									</AvatarFallback>
								</Avatar>
								<div>
									<CardTitle className="text-base">
										{candidate.firstName} {candidate.lastName}
									</CardTitle>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{candidate.user?.email && (
								<div className="flex items-center gap-2 text-sm">
									<Mail className="size-4 text-muted-foreground" />
									<a
										href={`mailto:${candidate.user.email}`}
										className="hover:underline"
									>
										{candidate.user.email}
									</a>
								</div>
							)}
							{candidate.phone && (
								<div className="flex items-center gap-2 text-sm">
									<Phone className="size-4 text-muted-foreground" />
									<span>{candidate.phone}</span>
								</div>
							)}

							{/* Social links */}
							<div className="flex flex-wrap gap-2 pt-2">
								{candidate.linkedin && (
									<Button variant="outline" size="sm" asChild>
										<a
											href={candidate.linkedin}
											target="_blank"
											rel="noopener noreferrer"
										>
											<Linkedin className="size-4" />
										</a>
									</Button>
								)}
								{candidate.github && (
									<Button variant="outline" size="sm" asChild>
										<a
											href={candidate.github}
											target="_blank"
											rel="noopener noreferrer"
										>
											<Github className="size-4" />
										</a>
									</Button>
								)}
								{candidate.twitter && (
									<Button variant="outline" size="sm" asChild>
										<a
											href={candidate.twitter}
											target="_blank"
											rel="noopener noreferrer"
										>
											<Twitter className="size-4" />
										</a>
									</Button>
								)}
								{candidate.portfolio && (
									<Button variant="outline" size="sm" asChild>
										<a
											href={candidate.portfolio}
											target="_blank"
											rel="noopener noreferrer"
										>
											<Globe className="size-4" />
										</a>
									</Button>
								)}
								{candidate.resume && (
									<Button variant="outline" size="sm" asChild>
										<a
											href={candidate.resume}
											target="_blank"
											rel="noopener noreferrer"
										>
											<FileText className="size-4" />
										</a>
									</Button>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Job Info Card */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Applied For</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<Link
								href={`/r/jobs/${job.id}`}
								className="font-medium hover:underline flex items-center gap-1"
							>
								{job.title}
								<ExternalLink className="size-3" />
							</Link>
							<div className="text-sm text-muted-foreground space-y-2">
								<div className="flex items-center gap-2">
									<Calendar className="size-4" />
									Applied {formatRelativeTime(new Date(response.createdAt))}
								</div>
								<div className="flex items-center gap-2">
									<MapPin className="size-4" />
									{job.location}
								</div>
								<div className="flex items-center gap-2">
									<Briefcase className="size-4" />
									{job.type}
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Main content area */}
				<div>
					<Tabs value={selectedTab} onValueChange={setSelectedTab}>
						<TabsList>
							<TabsTrigger value="profile">Profile Analysis</TabsTrigger>
							<TabsTrigger value="video">Video Analysis</TabsTrigger>
							<TabsTrigger value="responses">Interview Responses</TabsTrigger>
						</TabsList>

						{/* Profile Analysis Tab */}
						<TabsContent value="profile" className="mt-6 space-y-6">
							{scraperStatus === "processing" && (
								<Alert>
									<Loader2 className="size-4 animate-spin" />
									<AlertTitle>Processing Profile</AlertTitle>
									<AlertDescription>
										We are currently analyzing this candidate's profile and
										resume. This usually takes 2-3 minutes. The page will
										auto-refresh.
									</AlertDescription>
								</Alert>
							)}

							{scraperStatus === "error" && (
								<Alert variant="destructive">
									<AlertTriangle className="size-4" />
									<AlertTitle>Error</AlertTitle>
									<AlertDescription className="flex items-center gap-3">
										{scraperError}
										<Button onClick={fetchScraperData} size="sm">
											Retry
										</Button>
									</AlertDescription>
								</Alert>
							)}

							{scraperStatus === "complete" && scraperData && (
								<>
									{/* Basics Section */}
									<Card>
										<CardHeader>
											<CardTitle>Overview</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div>
												<div className="text-sm text-muted-foreground">
													Current Role
												</div>
												<div className="font-medium">
													{scraperData.basics.current_occupation}
												</div>
											</div>
											<div>
												<div className="text-sm text-muted-foreground">
													Location
												</div>
												<div className="font-medium">
													{scraperData.basics.location.city}
													{scraperData.basics.location.remote_preference &&
														" • Open to Remote"}
												</div>
											</div>
											{scraperData.basics.identity_tags.length > 0 && (
												<div>
													<div className="text-sm text-muted-foreground mb-2">
														Identity Tags
													</div>
													<div className="flex flex-wrap gap-2">
														{scraperData.basics.identity_tags.map((tag) => (
															<Badge key={tag} variant="secondary">
																{tag}
															</Badge>
														))}
													</div>
												</div>
											)}
											{scraperData.basics.profiles.length > 0 && (
												<div>
													<div className="text-sm text-muted-foreground mb-2">
														Profiles
													</div>
													<div className="space-y-2">
														{scraperData.basics.profiles.map((profile, idx) => (
															<div key={idx} className="text-sm">
																<a
																	href={profile.url}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="font-medium hover:underline"
																>
																	{profile.platform}
																</a>
																{profile.bio_summary && (
																	<p className="text-muted-foreground mt-0.5">
																		{profile.bio_summary}
																	</p>
																)}
															</div>
														))}
													</div>
												</div>
											)}
										</CardContent>
									</Card>

									{/* Professional DNA */}
									<Card>
										<CardHeader>
											<CardTitle>Professional DNA</CardTitle>
										</CardHeader>
										<CardContent className="space-y-6">
											{/* Skills */}
											<div>
												<div className="text-sm font-medium mb-3">Skills</div>
												<div className="space-y-3">
													{scraperData.professional_dna.skills.hard_skills
														.length > 0 && (
														<div>
															<div className="text-xs text-muted-foreground mb-1.5">
																Hard Skills
															</div>
															<div className="flex flex-wrap gap-1.5">
																{scraperData.professional_dna.skills.hard_skills.map(
																	(skill) => (
																		<Badge key={skill} variant="default">
																			{skill}
																		</Badge>
																	)
																)}
															</div>
														</div>
													)}
													{scraperData.professional_dna.skills.soft_skills
														.length > 0 && (
														<div>
															<div className="text-xs text-muted-foreground mb-1.5">
																Soft Skills
															</div>
															<div className="flex flex-wrap gap-1.5">
																{scraperData.professional_dna.skills.soft_skills.map(
																	(skill) => (
																		<Badge key={skill} variant="outline">
																			{skill}
																		</Badge>
																	)
																)}
															</div>
														</div>
													)}
													{scraperData.professional_dna.skills.tools.length >
														0 && (
														<div>
															<div className="text-xs text-muted-foreground mb-1.5">
																Tools
															</div>
															<div className="flex flex-wrap gap-1.5">
																{scraperData.professional_dna.skills.tools.map(
																	(tool) => (
																		<Badge key={tool} variant="secondary">
																			{tool}
																		</Badge>
																	)
																)}
															</div>
														</div>
													)}
												</div>
											</div>

											{/* Experience */}
											{scraperData.professional_dna.experience.length > 0 && (
												<div>
													<div className="text-sm font-medium mb-3">
														Experience
													</div>
													<div className="space-y-4">
														{scraperData.professional_dna.experience
															.slice(
																0,
																showAllExperience
																	? scraperData.professional_dna.experience.length
																	: 1
															)
															.map((exp, idx) => (
																<div
																	key={idx}
																	className="border-l-2 pl-4 space-y-1"
																>
																	<div className="font-medium">{exp.title}</div>
																	<div className="text-sm text-muted-foreground">
																		{exp.company} • {exp.duration}
																	</div>
																	{exp.cultural_context && (
																		<div className="text-sm">
																			{exp.cultural_context}
																		</div>
																	)}
																	{exp.impact_metrics.length > 0 && (
																		<ul className="text-sm list-disc list-inside space-y-0.5 mt-2">
																			{exp.impact_metrics.map((metric, i) => (
																				<li key={i}>{metric}</li>
																			))}
																		</ul>
																	)}
																</div>
															))}
													</div>
													{scraperData.professional_dna.experience.length > 1 &&
														!showAllExperience && (
															<Button
																variant="ghost"
																size="sm"
																onClick={() => setShowAllExperience(true)}
																className="mt-2"
															>
																Show rest (
																{scraperData.professional_dna.experience.length - 1}{" "}
																more)
															</Button>
														)}
												</div>
											)}
										</CardContent>
									</Card>

									{/* Personal DNA */}
									<Card>
										<CardHeader>
											<CardTitle>Personal DNA</CardTitle>
										</CardHeader>
										<CardContent className="space-y-6">
											{/* Education */}
											{scraperData.personal_dna.education.length > 0 && (
												<div>
													<div className="text-sm font-medium mb-3">
														Education
													</div>
													<div className="space-y-3">
														{scraperData.personal_dna.education.map(
															(edu, idx) => (
																<div key={idx} className="space-y-1">
																	<div className="font-medium">
																		{edu.degree} in {edu.focus}
																	</div>
																	<div className="text-sm text-muted-foreground">
																		{edu.institution}
																	</div>
																</div>
															)
														)}
													</div>
												</div>
											)}

											{/* Projects */}
											{scraperData.personal_dna.projects.length > 0 && (
												<div>
													<div className="text-sm font-medium mb-3">
														Projects
													</div>
													<div className="space-y-4">
														{scraperData.personal_dna.projects.map(
															(project, idx) => (
																<div key={idx} className="space-y-1">
																	<div className="flex items-center justify-between">
																		<div className="font-medium">
																			{project.name}
																		</div>
																		{project.link && (
																			<a
																				href={project.link}
																				target="_blank"
																				rel="noopener noreferrer"
																				className="text-sm text-primary hover:underline flex items-center gap-1"
																			>
																				View
																				<ExternalLink className="size-3" />
																			</a>
																		)}
																	</div>
																	<div className="text-sm text-muted-foreground">
																		{project.role}
																	</div>
																	<div className="text-sm">
																		{project.description}
																	</div>
																	{project.tech_stack?.length > 0 && (
																		<div className="flex flex-wrap gap-1.5 mt-2">
																			{project.tech_stack.map((tech) => (
																				<Badge
																					key={tech}
																					variant="outline"
																					className="text-xs"
																				>
																					{tech}
																				</Badge>
																			))}
																		</div>
																	)}
																</div>
															)
														)}
													</div>
												</div>
											)}

											{/* Volunteering */}
											{scraperData.personal_dna.volunteering.length > 0 && (
												<div>
													<div className="text-sm font-medium mb-3">
														Volunteering
													</div>
													<div className="space-y-3">
														{scraperData.personal_dna.volunteering.map(
															(vol, idx) => (
																<div key={idx} className="space-y-1">
																	<div className="font-medium">{vol.role}</div>
																	<div className="text-sm text-muted-foreground">
																		{vol.organization} • {vol.cause}
																	</div>
																</div>
															)
														)}
													</div>
												</div>
											)}

											{/* Hobbies & Interests */}
											{(scraperData.personal_dna.hobbies_and_interests
												.active_pursuits.length > 0 ||
												scraperData.personal_dna.hobbies_and_interests
													.intellectual_interests.length > 0) && (
												<div>
													<div className="text-sm font-medium mb-3">
														Interests
													</div>
													<div className="space-y-2">
														{scraperData.personal_dna.hobbies_and_interests
															.active_pursuits.length > 0 && (
															<div>
																<div className="text-xs text-muted-foreground mb-1">
																	Active Pursuits
																</div>
																<div className="text-sm">
																	{scraperData.personal_dna.hobbies_and_interests.active_pursuits.join(
																		", "
																	)}
																</div>
															</div>
														)}
														{scraperData.personal_dna.hobbies_and_interests
															.intellectual_interests.length > 0 && (
															<div>
																<div className="text-xs text-muted-foreground mb-1">
																	Intellectual Interests
																</div>
																<div className="text-sm">
																	{scraperData.personal_dna.hobbies_and_interests.intellectual_interests.join(
																		", "
																	)}
																</div>
															</div>
														)}
													</div>
												</div>
											)}
										</CardContent>
									</Card>

									{/* Identity Vitals */}
									<Card>
										<CardHeader>
											<CardTitle>Identity & Values</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											{scraperData.identity_mapping_vitals.career_trajectory && (
												<div>
													<div className="text-sm text-muted-foreground">
														Career Trajectory
													</div>
													<div className="text-sm">
														{
															scraperData.identity_mapping_vitals
																.career_trajectory
														}
													</div>
												</div>
											)}
											{scraperData.identity_mapping_vitals
												.communication_style && (
												<div>
													<div className="text-sm text-muted-foreground">
														Communication Style
													</div>
													<div className="text-sm">
														{
															scraperData.identity_mapping_vitals
																.communication_style
														}
													</div>
												</div>
											)}
											{scraperData.identity_mapping_vitals.value_alignment
												.length > 0 && (
												<div>
													<div className="text-sm text-muted-foreground mb-2">
														Value Alignment
													</div>
													<div className="flex flex-wrap gap-1.5">
														{scraperData.identity_mapping_vitals.value_alignment.map(
															(value) => (
																<Badge key={value} variant="secondary">
																	{value}
																</Badge>
															)
														)}
													</div>
												</div>
											)}
											{scraperData.extra && (
												<div>
													<div className="text-sm text-muted-foreground">
														Additional Notes
													</div>
													<div className="text-sm">
														<Streamdown mode={"static"}>
															{scraperData.extra}
														</Streamdown>
													</div>
												</div>
											)}
										</CardContent>
									</Card>
								</>
							)}
						</TabsContent>

						{/* Video Analysis Tab */}
						<TabsContent value="video" className="mt-6 space-y-6">
							{/* Video Player */}
							<Card>
								<CardHeader>
									<CardTitle>Interview Recording</CardTitle>
								</CardHeader>
								<CardContent>
									<video
										controls
										className="w-full rounded-lg"
										src={response.recordingUrl}
									>
										Your browser does not support the video tag.
									</video>
								</CardContent>
							</Card>

							{/* Loading State */}
							{isLoadingAnalysis && (
								<Card>
									<CardContent className="py-8">
										<div className="space-y-4">
											<div className="flex items-center justify-center gap-3">
												<Loader2 className="size-6 animate-spin" />
												<span className="text-muted-foreground">
													Analyzing video... This may take up to 60 seconds.
												</span>
											</div>
											<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
												{[1, 2, 3, 4, 5, 6].map((i) => (
													<Skeleton key={i} className="h-24 rounded-lg" />
												))}
											</div>
										</div>
									</CardContent>
								</Card>
							)}

							{/* Error State */}
							{analysisError && (
								<Alert variant="destructive">
									<AlertTriangle className="size-4" />
									<AlertTitle>Analysis Failed</AlertTitle>
									<AlertDescription className="flex items-center gap-3">
										{analysisError}
										<Button
											onClick={() => {
												setHasAttemptedVideoFetch(false);
												setAnalysisError(null);
											}}
											size="sm"
										>
											Retry
										</Button>
									</AlertDescription>
								</Alert>
							)}

							{/* Analysis Results */}
							{videoAnalysis && (
								<>
									{/* Metrics Grid */}
									<Card>
										<CardHeader>
											<CardTitle>Performance Metrics</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
												{[
													{
														label: "Body Language",
														value: videoAnalysis.body_language,
													},
													{ label: "Clarity", value: videoAnalysis.clarity },
													{
														label: "Confidence",
														value: videoAnalysis.confidence,
													},
													{
														label: "Eye Contact",
														value: videoAnalysis.eye_contact,
													},
													{
														label: "Speech Rate",
														value: videoAnalysis.speech_rate,
													},
													{
														label: "Voice Tone",
														value: videoAnalysis.voice_tone,
													},
												].map((metric) => (
													<div
														key={metric.label}
														className="border rounded-lg p-4 space-y-2"
													>
														<div className="text-sm text-muted-foreground">
															{metric.label}
														</div>
														<div className="flex items-baseline gap-1">
															<span className="text-3xl font-bold">
																{metric.value}
															</span>
															<span className="text-muted-foreground">/10</span>
														</div>
														<div className="w-full bg-secondary rounded-full h-2">
															<div
																className="bg-primary rounded-full h-2 transition-all"
																style={{
																	width: `${(metric.value / 10) * 100}%`,
																}}
															/>
														</div>
													</div>
												))}
											</div>
										</CardContent>
									</Card>

									{/* Keywords */}
									{videoAnalysis.keywords && (
										<Card>
											<CardHeader>
												<CardTitle>Keywords</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="flex flex-wrap gap-2">
													{videoAnalysis.keywords.split(", ").map((keyword) => (
														<Badge key={keyword} variant="secondary">
															{keyword}
														</Badge>
													))}
												</div>
											</CardContent>
										</Card>
									)}

									{/* Key Points */}
									{videoAnalysis.key_points.length > 0 && (
										<Card>
											<CardHeader>
												<CardTitle>Key Insights</CardTitle>
											</CardHeader>
											<CardContent>
												<ul className="space-y-3">
													{videoAnalysis.key_points.map((point, idx) => (
														<li key={idx} className="flex gap-3">
															<span className="text-primary mt-0.5">•</span>
															<span className="text-sm">{point}</span>
														</li>
													))}
												</ul>
											</CardContent>
										</Card>
									)}
								</>
							)}
						</TabsContent>

						{/* Interview Responses Tab */}
						<TabsContent value="responses" className="mt-6 space-y-4">
							{job.interviewQuestions.map((question, idx) => (
								<Card key={idx}>
									<CardHeader>
										<CardTitle className="text-base">
											Question {idx + 1}
										</CardTitle>
										<CardDescription>{question}</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="text-sm bg-muted p-4 rounded-lg">
											{response.transcriptResponses[idx] ?? (
												<span className="text-muted-foreground italic">
													No response
												</span>
											)}
										</div>
									</CardContent>
								</Card>
							))}
							{job.interviewQuestions.length === 0 && (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<div className="rounded-lg border bg-card p-8 max-w-md">
										<h3 className="font-semibold mb-2">
											No interview questions
										</h3>
										<p className="text-muted-foreground text-sm">
											This job posting does not have any interview questions
											configured.
										</p>
									</div>
								</div>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
