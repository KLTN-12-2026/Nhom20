import { useEffect, type ReactNode } from 'react';

interface AppModalProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg' | 'xl';
  onClose: () => void;
}

export default function AppModal({
  title,
  children,
  footer,
  size,
  onClose,
}: AppModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <>
      <div
        className="modal show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        tabIndex={-1}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className={`modal-dialog modal-dialog-centered modal-dialog-scrollable${
            size ? ` modal-${size}` : ''
          }`}
        >
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title" id="app-modal-title">
                {title}
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Đóng"
                onClick={onClose}
              />
            </div>

            <div className="modal-body">{children}</div>

            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
