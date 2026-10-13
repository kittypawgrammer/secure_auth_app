type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
};

export function Button({ loading, disabled, children, ...props }: ButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {loading ? "Please wait..." : children}
        </button>
    );
}