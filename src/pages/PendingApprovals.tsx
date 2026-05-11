import { useEffect, useState } from 'react';
import { getPendingUsersApi, approveRejectUserApi, type PendingUser } from '@/services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const PendingApprovals = () => {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadPending = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPendingUsersApi();
      setUsers(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load pending users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleAction = async (userId: string, action: 'Approved' | 'Rejected') => {
    setProcessingId(userId);
    try {
      const res = await approveRejectUserApi({ userId, action });
      setToast({ message: res.message, type: 'success' });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      setToast({ message: err?.message || 'Action failed.', type: 'error' });
    } finally {
      setProcessingId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pending Approvals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and approve or reject new user registrations.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPending} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {toast && (
        <Alert variant={toast.type === 'error' ? 'destructive' : 'default'}>
          {toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription>{toast.message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && users.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            No pending registrations at this time.
          </CardContent>
        </Card>
      )}

      {!loading && users.length > 0 && (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{user.fullName}</span>
                      <Badge variant={user.signupRole === 'Player' ? 'secondary' : 'outline'}>
                        {user.signupRole}
                      </Badge>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                        Pending
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Registered:{' '}
                      {user.createdAt
                        ? format(new Date(user.createdAt), 'dd MMM yyyy, HH:mm')
                        : '—'}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={processingId === user.id}
                      onClick={() => handleAction(user.id, 'Approved')}
                    >
                      {processingId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><CheckCircle2 className="h-4 w-4 mr-1" />Approve</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={processingId === user.id}
                      onClick={() => handleAction(user.id, 'Rejected')}
                    >
                      {processingId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><XCircle className="h-4 w-4 mr-1" />Reject</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;
