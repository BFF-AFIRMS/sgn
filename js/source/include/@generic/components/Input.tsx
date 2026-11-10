export const TextInput = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input type="text" className="tw:block tw:w-full tw:rounded-md tw:border tw:border-neutral-300 tw:h-9 tw:px-2 tw:text-sm tw:bg-white tw:shadow-sm tw:focus:border-blue-500 tw:focus:ring tw:focus:ring-blue-500 tw:focus:ring-opacity-50" {...props} />
);