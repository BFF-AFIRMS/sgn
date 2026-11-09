import { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'default' | 'primary';

const STYLES: Record<ButtonVariant, string> = {
	'default': 'tw:bg-white tw:hover:bg-gray-100 tw:text-gray-800 tw:font-semibold tw:py-2 tw:px-4 tw:border tw:border-gray-400 tw:rounded tw:shadow',
	'primary': 'tw:bg-blue-500 tw:hover:bg-blue-700 tw:text-white tw:font-semibold tw:py-2 tw:px-4 tw:border tw:border-blue-700 tw:rounded tw:shadow'
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