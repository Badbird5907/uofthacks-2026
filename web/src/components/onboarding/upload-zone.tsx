import * as React from "react";
import { FileText, Loader2, Upload } from "lucide-react";

interface UploadZoneProps {
	isDragging: boolean;
	isProcessing: boolean;
	isUploading: boolean;
	uploadedFile: File | null;
	onDragOver: (e: React.DragEvent) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => void;
	onClick: () => void;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadZone({
	isDragging,
	isProcessing,
	isUploading,
	uploadedFile,
	onDragOver,
	onDragLeave,
	onDrop,
	onClick,
	fileInputRef,
	onFileSelect,
}: UploadZoneProps) {
	return (
		<div
			className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            ${isProcessing ? "pointer-events-none opacity-60" : ""}
          `}
			onClick={onClick}
			onDragLeave={onDragLeave}
			onDragOver={onDragOver}
			onDrop={onDrop}
		>
			<input
				accept=".pdf"
				className="hidden"
				disabled={isProcessing}
				onChange={onFileSelect}
				ref={fileInputRef}
				type="file"
			/>

			{isProcessing ? (
				<div className="space-y-3">
					<Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
					<div>
						<p className="font-medium">
							{isUploading
								? "Uploading resume..."
								: "Analyzing your resume..."}
						</p>
						<p className="text-muted-foreground text-sm">
							{isUploading
								? "Please wait while we upload your file"
								: "Gemini is extracting your information"}
						</p>
					</div>
				</div>
			) : uploadedFile ? (
				<div className="space-y-3">
					<FileText className="mx-auto h-10 w-10 text-primary" />
					<div>
						<p className="font-medium">{uploadedFile.name}</p>
						<p className="text-muted-foreground text-sm">
							Click to change file
						</p>
					</div>
				</div>
			) : (
				<div className="space-y-3">
					<Upload className="mx-auto h-10 w-10 text-muted-foreground" />
					<div>
						<p className="font-medium">Drop your resume here</p>
						<p className="text-muted-foreground text-sm">
							or click to browse (PDF only)
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
