type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
};

export function Input({ label, error, id, ...props }: InputProps) {
    const inputId = id ?? props.name; // links the label to the input (accessibility)

    return (
        <div className="space-y-1">
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
                {label}
            </label>
            <input
                id={inputId}
                {...props}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}