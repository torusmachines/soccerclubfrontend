import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { reConsentApi } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

const Consent = () => {
  const navigate = useNavigate();
  const { loadUser } = useAuth();
  const [consentGiven, setConsentGiven] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!consentGiven) {
      setError('You must accept the privacy policy to continue.');
      return;
    }

    setIsLoading(true);
    try {
      await reConsentApi({ consentGiven: true });
      await loadUser();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Unable to update consent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Consent Required</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-muted-foreground">
              To continue using the platform, you must review and accept the latest privacy policy.
            </p>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                disabled={isLoading}
                className="mt-1"
                required
              />
              <span>
                I agree to the{' '}
                <Link to="/privacy-policy" target="_blank" rel="noreferrer" className="underline text-primary">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={isLoading || !consentGiven}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating consent...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Consent;
