import { useEffect, useState, type ReactNode } from 'react';

export interface ModalAction {
  label: string;
  cls?: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function Modal(props: {
  title: string;
  sub?: string;
  icon?: string;
  cls?: string;
  actions: ModalAction[];
  onClose: () => void;
  dismissable?: boolean;
  children: ReactNode;
}) {
  const { title, sub, icon, cls, actions, onClose, dismissable = true, children } = props;
  const [show, setShow] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true));
    document.body.classList.add('modal-open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [dismissable, onClose]);

  return (
    <div
      className={'modal-backdrop' + (show ? ' show' : '')}
      onClick={(e) => {
        if (e.target === e.currentTarget && dismissable) onClose();
      }}
    >
      <div className={'modal' + (cls ? ' ' + cls : '')} role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        {icon && <div className="modal-ico">{icon}</div>}
        <h3 id="modalTitle">{title}</h3>
        {sub && <p className="muted small modal-sub">{sub}</p>}
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          {actions.map((a) => (
            <button key={a.label} type="button" className={'btn ' + (a.cls ?? '')} onClick={a.onClick} disabled={a.disabled} autoFocus={a.primary}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
