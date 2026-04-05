import { useAuth } from '@/domains/auth';
import { useState } from 'react';
import { TbUserCancel } from 'react-icons/tb';

const ImpersonationExitButton = () => {
  const { isImpersonating, stopImpersonation } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!isImpersonating) {
    return null;
  }

  const handleStop = async () => {
    try {
      setBusy(true);
      await stopImpersonation();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="topbar-item">
      <button
        type="button"
        className="topbar-link btn btn-default btn-icon"
        aria-label="Stop viewing as user"
        title="Stop viewing as user"
        disabled={busy}
        onClick={() => void handleStop()}
      >
        {busy ? (
          <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden />
        ) : (
          <TbUserCancel className="fs-xxl" />
        )}
      </button>
    </div>
  );
};

export default ImpersonationExitButton;
