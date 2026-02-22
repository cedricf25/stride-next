interface FormFieldProps {
  label: string;
  htmlFor?: string;
  labelSuffix?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export default function FormField({
  label,
  htmlFor,
  labelSuffix,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        {label}
        {labelSuffix && (
          <span className="ml-1 font-normal text-gray-400">{labelSuffix}</span>
        )}
      </label>
      {children}
    </div>
  );
}
