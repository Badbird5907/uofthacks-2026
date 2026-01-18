import type { FieldApi } from "@tanstack/react-form";
import { Field, FieldError, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
interface FormFieldWrapperProps {
	field: FieldApi<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>;
	label: string;
	placeholder?: string;
	description?: string;
	type?: string;
	readOnly?: boolean;
	className?: string;
}

export function FormFieldWrapper({
	field,
	label,
	placeholder,
	description,
	type = "text",
	readOnly = false,
	className,
}: FormFieldWrapperProps) {
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			{description && <FieldDescription>{description}</FieldDescription>}
			<Input
				className={className}
				name={field.name}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				placeholder={placeholder}
				type={type}
				value={field.state.value}
				readOnly={readOnly}
			/>
			{field.state.meta.errors.length > 0 && (
				<FieldError errors={field.state.meta.errors} />
			)}
		</Field>
	);
}
