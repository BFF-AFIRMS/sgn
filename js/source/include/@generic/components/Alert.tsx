export type AlertVariant = 'success' | 'error';

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
	message: string;
	onClose?: () => void;
	canClose?: boolean;
	variant?: AlertVariant
};

const STYLES: Record<AlertVariant, string> = {
	success: 'alert-success',
	error: 'alert-danger',
};

export const Alert: React.FC<AlertProps> = ({ message, variant = 'success', onClose, canClose = true, ...props }) => (
	<div className={`alert ${STYLES[variant]}`} role="status" {...props}>
		{canClose && (
			<button
				type="button"
				className="close"
				aria-label="Dismiss"
				onClick={onClose}
			>
				&times;
			</button>
		)}
		{message}
	</div>
);