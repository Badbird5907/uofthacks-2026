import * as React from "react";

interface CodeInputProps {
	code: string;
	onChange: (code: string) => void;
	disabled?: boolean;
}

export function CodeInput({ code, onChange, disabled = false }: CodeInputProps) {
	const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

	const handleDigitChange = (index: number, value: string) => {
		// Only allow digits
		const digit = value.replace(/\D/g, "").slice(-1);

		const newCode = code.split("");
		newCode[index] = digit;
		const updatedCode = newCode.join("").slice(0, 4);
		onChange(updatedCode);

		// Auto-focus next input
		if (digit && index < 3) {
			inputRefs.current[index + 1]?.focus();
		}
	};

	const handleKeyDown = (
		index: number,
		e: React.KeyboardEvent<HTMLInputElement>,
	) => {
		if (e.key === "Backspace" && !code[index] && index > 0) {
			inputRefs.current[index - 1]?.focus();
		}
	};

	const handlePaste = (e: React.ClipboardEvent) => {
		e.preventDefault();
		const pastedData = e.clipboardData
			.getData("text")
			.replace(/\D/g, "")
			.slice(0, 4);
		onChange(pastedData);

		// Focus the appropriate input
		const focusIndex = Math.min(pastedData.length, 3);
		inputRefs.current[focusIndex]?.focus();
	};

	return (
		<div className="flex justify-center gap-3">
			{[0, 1, 2, 3].map((index) => (
				<input
					key={index}
					ref={(el) => {
						inputRefs.current[index] = el;
					}}
					className="w-14 h-14 text-center text-2xl font-semibold rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					maxLength={1}
					value={code[index] || ""}
					onChange={(e) => handleDigitChange(index, e.target.value)}
					onKeyDown={(e) => handleKeyDown(index, e)}
					onPaste={handlePaste}
					disabled={disabled}
					inputMode="numeric"
					pattern="[0-9]*"
				/>
			))}
		</div>
	);
}
