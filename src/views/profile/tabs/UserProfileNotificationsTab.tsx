import { useAuth } from '@/domains/auth';
import { mergeProfilePrefs, parseProfilePrefs } from '@/domains/profile/profilePrefs';
import { account } from '@/services/appwrite';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';

const UserProfileNotificationsTab = () => {
  const { user, refreshUser } = useAuth();
  const initial = useMemo(() => parseProfilePrefs(user?.prefs), [user?.prefs]);

  const [emailOn, setEmailOn] = useState(initial.notifyEmail !== false);
  const [platformOn, setPlatformOn] = useState(initial.notifyPlatform !== false);
  const [message, setMessage] = useState<{ variant: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    const p = parseProfilePrefs(user?.prefs);
    setEmailOn(p.notifyEmail !== false);
    setPlatformOn(p.notifyPlatform !== false);
  }, [user?.prefs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in.');
      const next = mergeProfilePrefs(user.prefs, {
        notifyEmail: emailOn,
        notifyPlatform: platformOn,
      });
      await account.updatePrefs(next);
    },
    onSuccess: async () => {
      setMessage({ variant: 'success', text: 'Notification preferences saved.' });
      await refreshUser();
    },
    onError: (err: unknown) => {
      setMessage({ variant: 'danger', text: err instanceof Error ? err.message : 'Could not save preferences.' });
    },
  });

  return (
    <div>
      <p className="text-muted fs-xs text-uppercase fw-semibold mb-2">Channels</p>
      <p className="text-muted fs-sm mb-4">
        Choose where you want to receive product updates, alerts, and subscription-related messages. Delivery still depends on features enabled for
        your workspace.
      </p>

      {message ? (
        <Alert variant={message.variant} className="py-2 fs-sm mb-3">
          {message.text}
        </Alert>
      ) : null}

      <Form
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          saveMutation.mutate();
        }}
      >
        <div className="border rounded p-3 mb-3">
          <Form.Check
            type="switch"
            id="notify-email"
            className="mb-3"
            label={
              <span>
                <span className="fw-semibold d-block">Email</span>
                <span className="text-muted fs-xs fw-normal">Important notices and digests sent to your account email.</span>
              </span>
            }
            checked={emailOn}
            onChange={(e) => setEmailOn(e.target.checked)}
          />
          <Form.Check
            type="switch"
            id="notify-platform"
            label={
              <span>
                <span className="fw-semibold d-block">On platform</span>
                <span className="text-muted fs-xs fw-normal">In-app notifications and badges while you use WPHub.Pro.</span>
              </span>
            }
            checked={platformOn}
            onChange={(e) => setPlatformOn(e.target.checked)}
          />
        </div>
        <Button type="submit" variant="primary" size="sm" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving…
            </>
          ) : (
            'Save notification settings'
          )}
        </Button>
      </Form>
    </div>
  );
};

export default UserProfileNotificationsTab;
