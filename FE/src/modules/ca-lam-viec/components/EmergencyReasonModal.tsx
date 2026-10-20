import { useState } from 'react';

import AppModal from '@/components/ui/AppModal';

interface EmergencyReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export default function EmergencyReasonModal({
  isOpen,
  onClose,
  onSubmit,
}: EmergencyReasonModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <AppModal
      title="Thay đổi lịch đột xuất"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!reason.trim()}
            onClick={() => {
              onSubmit(reason.trim());
              setReason('');
            }}
          >
            Lưu thay đổi
          </button>
        </>
      }
    >
      <div className="mb-3">
        <label htmlFor="emergency-reason" className="form-label">
          Vui lòng nhập lý do thay đổi lịch (Ví dụ: Bs A ốm, NV B có việc bận...)
          <span className="text-danger"> *</span>
        </label>
        <textarea
          id="emergency-reason"
          className="form-control"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Nhập lý do thay đổi..."
          autoFocus
        />
        <div className="form-text">
          Lý do này sẽ được ghi nhận vào hệ thống để phục vụ đối soát và tính lương.
        </div>
      </div>
    </AppModal>
  );
}
