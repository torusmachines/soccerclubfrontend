import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Privacy Policy (v1.0)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Effective date: 2026-04-24
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground leading-6">
            <p>
              We collect and process personal data for account creation, access control,
              platform functionality, communication, and regulatory compliance.
            </p>
            <p>
              Data may include your name, email, role information, authentication details,
              and activity records needed to operate the platform.
            </p>
            <p>
              By consenting, you allow us to process your data according to this policy.
              You may withdraw consent at any time; withdrawal may deactivate your access.
            </p>
            <p>
              We keep consent history records including policy version, source, and timestamp
              for auditability and legal compliance.
            </p>
            <p>
              For questions about data processing, contact your platform administrator.
            </p>

            <div className="pt-4">
              <Link to="/login" className="underline text-primary">
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
