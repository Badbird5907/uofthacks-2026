"use client";

import { FileText, Loader2, Sparkles, Upload, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

export interface JobFormData {
	title: string;
	description: string;
	location: string;
	workMode: string;
	salary: string;
	type: string;
	interviewQuestions: string[];
	notes: string;
}

interface ParsedData {
	title: string | null;
	description: string | null;
	location: string | null;
	workMode: "remote" | "hybrid" | "on-site" | null;
	salary: string | null;
	type: "full-time" | "part-time" | "contract" | "internship" | null;
	interviewQuestions: string[] | null;
	notes: string | null;
}

interface AIAssistModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onApply: (data: Partial<JobFormData>) => void;
	currentValues: JobFormData;
}

type FieldKey = keyof ParsedData;

const fieldLabels: Record<FieldKey, string> = {
	title: "Job Title",
	description: "Description",
	location: "Location",
	workMode: "Work Mode",
	salary: "Salary",
	type: "Job Type",
	interviewQuestions: "Interview Questions",
	notes: "AI Interviewer Notes",
};

const workModeLabels: Record<string, string> = {
	remote: "Remote",
	hybrid: "Hybrid",
	"on-site": "On-site",
};

const jobTypeLabels: Record<string, string> = {
	"full-time": "Full-time",
	"part-time": "Part-time",
	contract: "Contract",
	internship: "Internship",
};

export function AIAssistModal({
	open,
	onOpenChange,
	onApply,
	currentValues,
}: AIAssistModalProps) {
	const [activeTab, setActiveTab] = React.useState<"text" | "file">("text");
	const [textContent, setTextContent] = React.useState("");
	const [file, setFile] = React.useState<File | null>(null);
	const [parsedData, setParsedData] = React.useState<ParsedData | null>(null);
	const [selectedFields, setSelectedFields] = React.useState<Set<FieldKey>>(
		new Set()
	);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const parseContent = api.jobPosting.parseContent.useMutation({
		onSuccess: (data) => {
			setParsedData(data);
			// Auto-select fields that have values and either form is empty or values differ
			const autoSelected = new Set<FieldKey>();
			for (const key of Object.keys(data) as FieldKey[]) {
				const value = data[key];
				if (value !== null && value !== undefined) {
					const currentValue = currentValues[key as keyof JobFormData];
					// Select if current form field is empty or if it's a new suggestion
					if (
						!currentValue ||
						(Array.isArray(currentValue) && currentValue.length === 0) ||
						(Array.isArray(currentValue) &&
							currentValue.length === 1 &&
							currentValue[0] === "")
					) {
						autoSelected.add(key);
					}
				}
			}
			setSelectedFields(autoSelected);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to parse content");
		},
	});

	const handleGenerate = async () => {
		if (activeTab === "text") {
			if (!textContent.trim()) {
				toast.error("Please enter some content");
				return;
			}
			parseContent.mutate({ content: textContent });
		} else {
			if (!file) {
				toast.error("Please select a file");
				return;
			}
			const reader = new FileReader();
			reader.onload = () => {
				const base64 = (reader.result as string).split(",")[1];
				const fileType = file.type.includes("pdf") ? "pdf" : "docx";
				parseContent.mutate({ fileBase64: base64, fileType });
			};
			reader.readAsDataURL(file);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			const validTypes = [
				"application/pdf",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			];
			if (!validTypes.includes(selectedFile.type)) {
				toast.error("Please select a PDF or DOCX file");
				return;
			}
			setFile(selectedFile);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile) {
			const validTypes = [
				"application/pdf",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			];
			if (!validTypes.includes(droppedFile.type)) {
				toast.error("Please select a PDF or DOCX file");
				return;
			}
			setFile(droppedFile);
		}
	};

	const toggleField = (field: FieldKey) => {
		const newSelected = new Set(selectedFields);
		if (newSelected.has(field)) {
			newSelected.delete(field);
		} else {
			newSelected.add(field);
		}
		setSelectedFields(newSelected);
	};

	const handleApply = () => {
		if (!parsedData) return;

		const dataToApply: Partial<JobFormData> = {};
		for (const field of selectedFields) {
			const value = parsedData[field];
			if (value !== null && value !== undefined) {
				if (field === "interviewQuestions") {
					dataToApply.interviewQuestions = value as string[];
				} else {
					(dataToApply as Record<string, unknown>)[field] = value;
				}
			}
		}

		onApply(dataToApply);
		handleClose();
	};

	const handleClose = () => {
		setTextContent("");
		setFile(null);
		setParsedData(null);
		setSelectedFields(new Set());
		onOpenChange(false);
	};

	const renderFieldValue = (field: FieldKey, value: unknown) => {
		if (value === null || value === undefined) return null;

		if (field === "interviewQuestions" && Array.isArray(value)) {
			return (
				<ul className="list-disc list-inside space-y-1">
					{value.map((q, i) => (
						<li key={i} className="text-muted-foreground">
							{q}
						</li>
					))}
				</ul>
			);
		}

		if (field === "workMode") {
			const label = workModeLabels[value as string] || String(value);
			return (
				<span className="text-muted-foreground">
					{label}
				</span>
			);
		}

		if (field === "type") {
			const label = jobTypeLabels[value as string] || String(value);
			return (
				<span className="text-muted-foreground">
					{label}
				</span>
			);
		}

		if (field === "description" || field === "notes") {
			const text = value as string;
			return (
				<div className="text-muted-foreground whitespace-pre-wrap line-clamp-4">
					{text}
				</div>
			);
		}

		return <span className="text-muted-foreground">{value as string}</span>;
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="size-4" />
						AI Writing Assistant
					</DialogTitle>
					<DialogDescription>
						Paste a job description or upload a document to automatically fill
						in the form fields.
					</DialogDescription>
				</DialogHeader>

				{!parsedData ? (
					<>
						<Tabs
							value={activeTab}
							onValueChange={(v) => setActiveTab(v as "text" | "file")}
						>
							<TabsList className="w-full">
								<TabsTrigger value="text" className="flex-1">
									Paste Text
								</TabsTrigger>
								<TabsTrigger value="file" className="flex-1">
									Upload File
								</TabsTrigger>
							</TabsList>
						</Tabs>

						{activeTab === "text" ? (
							<Textarea
								value={textContent}
								onChange={(e) => setTextContent(e.target.value)}
								placeholder="Paste a job description, requirements, or any relevant content here..."
								className="min-h-[200px]"
							/>
						) : (
							<div
								className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-foreground/30 transition-colors"
								onDragOver={(e) => e.preventDefault()}
								onDrop={handleDrop}
								onClick={() => fileInputRef.current?.click()}
							>
								<input
									ref={fileInputRef}
									type="file"
									accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
									onChange={handleFileChange}
									className="hidden"
								/>
								{file ? (
									<div className="flex items-center justify-center gap-2">
										<FileText className="size-5 text-muted-foreground" />
										<span className="font-medium">{file.name}</span>
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											onClick={(e) => {
												e.stopPropagation();
												setFile(null);
											}}
										>
											<X className="size-3" />
										</Button>
									</div>
								) : (
									<div className="space-y-2">
										<Upload className="size-8 mx-auto text-muted-foreground" />
										<p className="text-sm text-muted-foreground">
											Drag and drop a PDF or DOCX file, or click to browse
										</p>
									</div>
								)}
							</div>
						)}

						<DialogFooter>
							<Button variant="outline" onClick={handleClose}>
								Cancel
							</Button>
							<Button
								onClick={handleGenerate}
								disabled={
									parseContent.isPending ||
									(activeTab === "text" && !textContent.trim()) ||
									(activeTab === "file" && !file)
								}
							>
								{parseContent.isPending ? (
									<>
										<Loader2 className="mr-1.5 animate-spin" />
										Analyzing...
									</>
								) : (
									<>
										<Sparkles className="mr-1.5" />
										Generate
									</>
								)}
							</Button>
						</DialogFooter>
					</>
				) : (
					<>
						<div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
							<p className="text-sm text-muted-foreground">
								Select the fields you want to apply to the form:
							</p>
							{(Object.keys(parsedData) as FieldKey[]).map((field) => {
								const value = parsedData[field];
								if (value === null || value === undefined) return null;
								if (field === "interviewQuestions" && Array.isArray(value) && value.length === 0) return null;

								return (
									<div
										key={field}
										className="flex gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
										onClick={() => toggleField(field)}
									>
										<Checkbox
											checked={selectedFields.has(field)}
											onCheckedChange={() => toggleField(field)}
											className="mt-0.5"
										/>
										<div className="flex-1 min-w-0">
											<div className="font-medium text-sm mb-1">
												{fieldLabels[field]}
											</div>
											{renderFieldValue(field, value)}
										</div>
									</div>
								);
							})}
						</div>

						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => {
									setParsedData(null);
									setSelectedFields(new Set());
								}}
							>
								Back
							</Button>
							<Button
								onClick={handleApply}
								disabled={selectedFields.size === 0}
							>
								Apply Selected ({selectedFields.size})
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
