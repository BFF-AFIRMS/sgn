import { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'default' | 'default-sm' | 'primary' | 'primary-sm';

const BASE_STYLES = 'tw:inline-flex w:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:rounded-lg tw:border tw:text-sm tw:font-medium tw:whitespace-nowrap tw:shadow-xs tw:transition-colors tw:duration-150 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:aria-busy:cursor-progress tw:aria-disabled:cursor-not-allowed tw:aria-disabled:opacity-50 tw:motion-safe:active:translate-y-px tw:motion-reduce:transition-none';

const STYLES: Record<ButtonVariant, string> = {
    'default':    `${BASE_STYLES} tw:h-9 tw:border-neutral-200 tw:bg-white     tw:px-3.5 tw:text-neutral-950 tw:hover:bg-neutral-50 tw:focus-visible:outline-zinc-950  tw:active:bg-neutral-100`,
    'default-sm': `${BASE_STYLES} tw:h-8 tw:border-neutral-200 tw:bg-white     tw:px-2   tw:text-neutral-950 tw:hover:bg-neutral-50 tw:focus-visible:outline-zinc-950  tw:active:bg-neutral-100`,
    'primary':    `${BASE_STYLES} tw:h-9 tw:border-green-900   tw:bg-green-700 tw:px-3.5 tw:text-white       tw:hover:bg-green-800  tw:focus-visible:outline-green-950 tw:active:bg-green-700`,
    'primary-sm': `${BASE_STYLES} tw:h-8 tw:border-green-900   tw:bg-green-700 tw:px-2   tw:text-white       tw:hover:bg-green-800  tw:focus-visible:outline-green-950 tw:active:bg-green-700`
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
	ref?: React.Ref<HTMLButtonElement>;
}

export const Button = ({ children, variant = 'default', className = '', ...props }: ButtonProps) => {
    return (
        <button className={`${STYLES[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};