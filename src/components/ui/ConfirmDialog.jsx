import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, variant = 'danger' }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p style={{ fontSize: 13, marginBottom: 20 }}>{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant={variant} onClick={onConfirm}>{confirmLabel || t('common.confirm')}</Button>
      </div>
    </Modal>
  );
}
