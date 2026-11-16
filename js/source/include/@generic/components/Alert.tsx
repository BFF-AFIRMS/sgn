export type AlertVariant = 'success' | 'error';

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
	message: string;
	onClose?: () => void;
	canClose?: boolean;
	variant?: AlertVariant
};

export const Alert: React.FC<AlertProps> = ({ message, variant: type = 'success', onClose, canClose = true, ...props }) => (
	<div className={`alert alert-${type}`} role="status" {...props}>
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