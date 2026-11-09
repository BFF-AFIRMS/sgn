import { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'default' | 'default-sm' | 'primary' | 'primary-sm';

const STYLES: Record<ButtonVariant, string> = {
    'default': 'tw:inline-flex tw:h-9 tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:border tw:border-neutral-200 tw:bg-white tw:px-3.5 tw:text-sm tw:font-medium tw:whitespace-nowrap tw:text-neutral-950 tw:shadow-xs tw:transition-colors tw:duration-150 tw:hover:bg-neutral-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-zinc-950 tw:active:bg-neutral-100 tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:aria-busy:cursor-progress tw:aria-disabled:cursor-not-allowed tw:aria-disabled:opacity-50 tw:motion-safe:active:translate-y-px tw:motion-reduce:transition-none',
    'default-sm': 'tw:inline-flex tw:h-8 tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:border tw:border-neutral-200 tw:bg-white tw:px-2 tw:text-sm tw:font-medium tw:whitespace-nowrap tw:text-neutral-950 tw:shadow-xs tw:transition-colors tw:duration-150 tw:hover:bg-neutral-50 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-zinc-950 tw:active:bg-neutral-100 tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:aria-busy:cursor-progress tw:aria-disabled:cursor-not-allowed tw:aria-disabled:opacity-50 tw:motion-safe:active:translate-y-px tw:motion-reduce:transition-none',
    'primary': 'tw:inline-flex tw:h-9 tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:border-0 tw:bg-green-700 tw:px-3.5 tw:text-sm tw:font-medium tw:whitespace-nowrap tw:text-white tw:shadow-xs tw:transition-colors tw:duration-150 tw:hover:bg-green-800 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-green-950 tw:active:bg-green-700 tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:aria-busy:cursor-progress tw:aria-disabled:cursor-not-allowed tw:aria-disabled:opacity-50 tw:motion-safe:active:translate-y-px tw:motion-reduce:transition-none',
    'primary-sm': 'tw:inline-flex tw:h-8 tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:border-0 tw:bg-green-700 tw:px-2 tw:text-sm tw:font-medium tw:whitespace-nowrap tw:text-white tw:shadow-xs tw:transition-colors tw:duration-150 tw:hover:bg-green-800 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-green-950 tw:active:bg-green-700 tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:aria-busy:cursor-progress tw:aria-disabled:cursor-not-allowed tw:aria-disabled:opacity-50 tw:motion-safe:active:translate-y-px tw:motion-reduce:transition-none'
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
	ref?: React.Ref<HTMLButtonElement>;
}

export const Button = ({ children, variant = 'default', ...props }: ButtonProps) => {
    return (
        <button className={STYLES[variant]} {...props}>
            {children}
        </button>
    );
};