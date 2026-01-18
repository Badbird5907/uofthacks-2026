"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AIAssistModal, type JobFormData } from "@/components/app/ai-assist-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

const workModes = [
	{ value: "remote", label: "Remote" },
	{ value: "hybrid", label: "Hybrid" },
	{ value: "on-site", label: "On-site" },
] as const;

const jobTypes = [
	{ value: "full-time", label: "Full-time" },
	{ value: "part-time", label: "Part-time" },
	{ value: "contract", label: "Contract" },
	{ value: "internship", label: "Internship" },
] as const;

const statuses = [
	{ value: "draft", label: "Draft" },
	{ value: "active", label: "Active" },
	{ value: "closed", label: "Closed" },
] as const;

interface JobFormProps {
	mode: "create" | "edit";
	initialData?: {
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
	};
}

export function JobForm({ mode, initialData }: JobFormProps) {
	const router = useRouter();
	const utils = api.useUtils();
	const [aiModalOpen, setAiModalOpen] = React.useState(false);

	const createJob = api.jobPosting.create.useMutation({
		onSuccess: (data) => {
			toast.success("Job posting created");
			utils.jobPosting.list.invalidate();
			router.push(`/r/jobs/${data.id}`);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const updateJob = api.jobPosting.update.useMutation({
		onSuccess: (data) => {
			toast.success("Job posting updated");
			utils.jobPosting.list.invalidate();
			utils.jobPosting.getById.invalidate({ id: data?.id });
			router.push(`/r/jobs/${data?.id}`);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const form = useForm({
		defaultValues: {
			title: initialData?.title ?? "",
			description: initialData?.description ?? "",
			location: initialData?.location ?? "",
			workMode: initialData?.workMode ?? "on-site",
			salary: initialData?.salary ?? "",
			type: initialData?.type ?? "full-time",
			status: initialData?.status ?? "draft",
			interviewQuestions: initialData?.interviewQuestions ?? [""],
			notes: initialData?.notes ?? "",
		},
		onSubmit: async ({ value }) => {
			const data = {
				title: value.title,
				description: value.description,
				location: value.location,
				workMode: value.workMode as "remote" | "hybrid" | "on-site",
				salary: value.salary || undefined,
				type: value.type as "full-time" | "part-time" | "contract" | "internship",
				status: value.status as "draft" | "active" | "closed",
				interviewQuestions: value.interviewQuestions.filter((q) => q.trim() !== ""),
				notes: value.notes || undefined,
			};

			if (mode === "create") {
				createJob.mutate(data);
			} else if (initialData) {
				updateJob.mutate({ ...data, id: initialData.id });
			}
		},
	});

	const isPending = createJob.isPending || updateJob.isPending;

	const handleAIApply = (data: Partial<JobFormData>) => {
		// Apply each field from AI suggestions
		if (data.title) form.setFieldValue("title", data.title);
		if (data.description) form.setFieldValue("description", data.description);
		if (data.location) form.setFieldValue("location", data.location);
		if (data.workMode) form.setFieldValue("workMode", data.workMode);
		if (data.salary) form.setFieldValue("salary", data.salary);
		if (data.type) form.setFieldValue("type", data.type);
		if (data.notes) form.setFieldValue("notes", data.notes);
		
		// Handle interview questions specially - replace existing if provided
		if (data.interviewQuestions && data.interviewQuestions.length > 0) {
			form.setFieldValue("interviewQuestions", data.interviewQuestions);
		}
		
		toast.success("Applied AI suggestions to form");
	};

	const currentValues: JobFormData = {
		title: form.state.values.title,
		description: form.state.values.description,
		location: form.state.values.location,
		workMode: form.state.values.workMode,
		salary: form.state.values.salary,
		type: form.state.values.type,
		interviewQuestions: form.state.values.interviewQuestions,
		notes: form.state.values.notes,
	};

	return (
		<>
			<AIAssistModal
				open={aiModalOpen}
				onOpenChange={setAiModalOpen}
				onApply={handleAIApply}
				currentValues={currentValues}
			/>
			<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-6"
		>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Job Details</CardTitle>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setAiModalOpen(true)}
						>
							<Sparkles className="mr-1.5" />
							AI Assist
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<form.Field
							name="title"
							validators={{
								onChange: z.string().min(1, "Title is required"),
							}}
						>
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor={field.name}>Job Title</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="e.g. Senior Software Engineer"
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field
							name="description"
							validators={{
								onChange: z.string().min(1, "Description is required"),
							}}
						>
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor={field.name}>Description</FieldLabel>
									<FieldDescription>
										Supports Markdown formatting
									</FieldDescription>
									<Textarea
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Describe the role, responsibilities, and requirements..."
										className="min-h-[200px]"
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<div className="grid gap-4 sm:grid-cols-2">
							<form.Field
								name="location"
								validators={{
									onChange: z.string().min(1, "Location is required"),
								}}
							>
								{(field) => (
									<Field data-invalid={field.state.meta.errors.length > 0}>
										<FieldLabel htmlFor={field.name}>Location</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="e.g. San Francisco, CA"
										/>
										<FieldError errors={field.state.meta.errors} />
									</Field>
								)}
							</form.Field>

							<form.Field name="workMode">
								{(field) => (
									<Field>
										<FieldLabel htmlFor={field.name}>Work Mode</FieldLabel>
										<select
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											className="h-8 w-full border border-input bg-transparent px-2.5 text-xs dark:bg-input/30"
										>
											{workModes.map((mode) => (
												<option key={mode.value} value={mode.value}>
													{mode.label}
												</option>
											))}
										</select>
									</Field>
								)}
							</form.Field>
						</div>

						<div className="grid gap-4 sm:grid-cols-3">
							<form.Field name="type">
								{(field) => (
									<Field>
										<FieldLabel htmlFor={field.name}>Job Type</FieldLabel>
										<select
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											className="h-8 w-full border border-input bg-transparent px-2.5 text-xs dark:bg-input/30"
										>
											{jobTypes.map((type) => (
												<option key={type.value} value={type.value}>
													{type.label}
												</option>
											))}
										</select>
									</Field>
								)}
							</form.Field>

							<form.Field name="status">
								{(field) => (
									<Field>
										<FieldLabel htmlFor={field.name}>Status</FieldLabel>
										<select
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											className="h-8 w-full border border-input bg-transparent px-2.5 text-xs dark:bg-input/30"
										>
											{statuses.map((status) => (
												<option key={status.value} value={status.value}>
													{status.label}
												</option>
											))}
										</select>
									</Field>
								)}
							</form.Field>

							<form.Field name="salary">
								{(field) => (
									<Field>
										<FieldLabel htmlFor={field.name}>
											Salary Range (optional)
										</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="e.g. $120k - $150k"
										/>
									</Field>
								)}
							</form.Field>
						</div>
					</FieldGroup>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>AI Interview Settings</CardTitle>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<form.Field name="interviewQuestions" mode="array">
							{(field) => (
								<Field>
									<FieldLabel>Interview Questions</FieldLabel>
									<FieldDescription>
										Questions the AI will ask candidates during the video
										interview
									</FieldDescription>
									<div className="space-y-2">
										{field.state.value.map((_, index) => (
											<form.Field
												key={index}
												name={`interviewQuestions[${index}]`}
											>
												{(subField) => (
													<div className="flex gap-2">
														<Input
															value={subField.state.value}
															onChange={(e) =>
																subField.handleChange(e.target.value)
															}
															placeholder={`Question ${index + 1}`}
														/>
														{field.state.value.length > 1 && (
															<Button
																type="button"
																variant="destructive"
																size="icon"
																onClick={() => field.removeValue(index)}
															>
																<Trash2 />
															</Button>
														)}
													</div>
												)}
											</form.Field>
										))}
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => field.pushValue("")}
										className="mt-2"
									>
										<Plus className="mr-1.5" />
										Add Question
									</Button>
								</Field>
							)}
						</form.Field>

						<form.Field name="notes">
							{(field) => (
								<Field>
									<FieldLabel htmlFor={field.name}>
										Notes for AI Interviewer (optional)
									</FieldLabel>
									<FieldDescription>
										Additional context or instructions for the AI during
										interviews
									</FieldDescription>
									<Textarea
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="e.g. Focus on problem-solving skills, look for experience with distributed systems..."
										className="min-h-[100px]"
									/>
								</Field>
							)}
						</form.Field>
					</FieldGroup>
				</CardContent>
			</Card>

			<div className="flex gap-3">
				<Button type="submit" disabled={isPending}>
					{isPending && <Loader2 className="mr-1.5 animate-spin" />}
					{mode === "create" ? "Create Job Posting" : "Save Changes"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.back()}
					disabled={isPending}
				>
					Cancel
				</Button>
			</div>
		</form>
		</>
	);
}
