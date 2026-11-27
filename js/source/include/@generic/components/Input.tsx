export const TextInput = ({ className = '', fullWidth = true, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { fullWidth?: boolean }) => (
    <input type="text" className={`tw:block ${fullWidth ? 'tw:w-full' : ''} tw:h-9 ${className}`} {...props} />
);