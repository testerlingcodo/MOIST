import { useCallback, useState } from 'react';

/**
 * Usage:
 *   const { confirm, confirmProps } = useConfirm();
 *   const ok = await confirm({ title: 'Delete?', message: 'Cannot be undone.', confirmLabel: 'Delete' });
 *   if (!ok) return;
 *   // render: <ConfirmModal {...confirmProps} />
 */
export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setState({ ...options, resolve });
  }), []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const confirmProps = state
    ? { open: true, title: state.title, message: state.message, confirmLabel: state.confirmLabel, cancelLabel: state.cancelLabel, variant: state.variant, onConfirm: handleConfirm, onCancel: handleCancel }
    : { open: false, onConfirm: handleConfirm, onCancel: handleCancel };

  return { confirm, confirmProps };
}
