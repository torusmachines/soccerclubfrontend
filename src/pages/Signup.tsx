import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchSportsApi, signupPlayerApi, signupScoutApi, uploadSignupProfileImageApi } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import type { Sport } from '@/types';

// ─── Password validation ───────────────────────────────────────────────────
const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
  { label: 'One special character', test: (v: string) => /[^a-zA-Z\d]/.test(v) },
];

function validatePassword(pw: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(pw)) return `Password must have: ${rule.label.toLowerCase()}.`;
  }
  return null;
}

// ─── Shared PasswordInput ─────────────────────────────────────────────────
function PasswordInput({
  id,
  value,
  onChange,
  placeholder = '••••••••',
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
        className="pr-10"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── Password strength indicator ─────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="mt-1 space-y-0.5">
      {PASSWORD_RULES.map((rule) => (
        <li
          key={rule.label}
          className={`flex items-center gap-1 text-xs ${
            rule.test(password) ? 'text-green-600' : 'text-muted-foreground'
          }`}
        >
          <CheckCircle2 className={`h-3 w-3 ${rule.test(password) ? 'text-green-600' : 'text-gray-300'}`} />
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

// ─── Player Signup Form ───────────────────────────────────────────────────
function PlayerSignupForm({ onSuccess, sports }: { onSuccess: () => void; sports: Sport[] }) {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    dateOfBirth: '', nationality: '',
    heightCm: '', weightKg: '', addressLine1: '', addressLine2: '',
    sportId: '', profileImage: '', pincode: '',
    consentGiven: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwError = validatePassword(form.password);
    if (pwError) { setError(pwError); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (!form.consentGiven) { setError('You must accept the privacy policy to continue.'); return; }

    setLoading(true);
    try {
      await signupPlayerApi({
        email: form.email,
        fullName: form.fullName,
        password: form.password,
        confirmPassword: form.confirmPassword,
        consentGiven: form.consentGiven,
        dateOfBirth: form.dateOfBirth || undefined,
        nationality: form.nationality || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        sportId: form.sportId ? Number(form.sportId) : undefined,
        profileImage: form.profileImage || undefined,
        pincode: form.pincode || undefined,
        addressLine1: form.addressLine1 || undefined,
        addressLine2: form.addressLine2 || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'mt-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Required */}
        <div>
          <Label htmlFor="fullName">Full Name *</Label>
          <Input id="fullName" className={inputCls} value={form.fullName} onChange={set('fullName')} required disabled={loading} />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" className={inputCls} value={form.email} onChange={set('email')} required disabled={loading} />
        </div>
        <div>
          <Label htmlFor="password">Password *</Label>
          <PasswordInput id="password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} disabled={loading} />
          <PasswordStrength password={form.password} />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <PasswordInput id="confirmPassword" value={form.confirmPassword} onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))} disabled={loading} />
        </div>

        {/* Player fields */}
        <div>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input id="dateOfBirth" type="date" className={inputCls} value={form.dateOfBirth} onChange={set('dateOfBirth')} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="nationality">Nationality</Label>
          <Input id="nationality" className={inputCls} value={form.nationality} onChange={set('nationality')} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="heightCm">Height (cm)</Label>
          <Input id="heightCm" type="number" className={inputCls} value={form.heightCm} onChange={set('heightCm')} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="weightKg">Weight (kg)</Label>
          <Input id="weightKg" type="number" className={inputCls} value={form.weightKg} onChange={set('weightKg')} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="sportId">Sport</Label>
          <select
            id="sportId"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.sportId}
            onChange={set('sportId')}
            disabled={loading}
          >
            <option value="">Select sport</option>
            {sports.map((sport) => (
              <option key={sport.sportId} value={String(sport.sportId)}>
                {sport.sportName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="profileImage">Profile Picture</Label>
          <Input
            id="profileImage"
            type="file"
            accept="image/*"
            className={inputCls}
            disabled={loading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const upload = await uploadSignupProfileImageApi(file);
                setForm((f) => ({ ...f, profileImage: upload.imageUrl }));
              } catch {
                setError('Unable to upload selected image. Please try another file.');
              }
            }}
          />
          {form.profileImage ? (
            <img
              src={form.profileImage}
              alt="Profile preview"
              className="mt-2 h-16 w-16 rounded-md object-cover bg-muted"
            />
          ) : null}
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <Label htmlFor="addressLine1">Address Line 1</Label>
          <Input id="addressLine1" className={inputCls} value={form.addressLine1} onChange={set('addressLine1')} disabled={loading} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="addressLine2">Address Line 2</Label>
          <Input id="addressLine2" className={inputCls} value={form.addressLine2} onChange={set('addressLine2')} disabled={loading} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="player-pincode">Pincode</Label>
          <Input id="player-pincode" className={inputCls} value={form.pincode} onChange={set('pincode')} disabled={loading} />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              id="player-consent"
              type="checkbox"
              checked={form.consentGiven}
              onChange={(e) => setForm((f) => ({ ...f, consentGiven: e.target.checked }))}
              disabled={loading}
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
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : 'Sign Up as Player'}
      </Button>
    </form>
  );
}

// ─── Scout Signup Form ────────────────────────────────────────────────────
function ScoutSignupForm({ onSuccess, sports }: { onSuccess: () => void; sports: Sport[] }) {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', phoneNumber: '',
    addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', country: '', sportId: '', profileImage: '',
    consentGiven: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwError = validatePassword(form.password);
    if (pwError) { setError(pwError); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (!form.consentGiven) { setError('You must accept the privacy policy to continue.'); return; }

    setLoading(true);
    try {
      await signupScoutApi({
        email: form.email,
        fullName: form.fullName,
        password: form.password,
        confirmPassword: form.confirmPassword,
        consentGiven: form.consentGiven,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        phoneNumber: form.phoneNumber || undefined,
        addressLine1: form.addressLine1 || undefined,
        addressLine2: form.addressLine2 || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        pincode: form.pincode || undefined,
        country: form.country || undefined,
        sportId: form.sportId ? Number(form.sportId) : undefined,
        profileImage: form.profileImage || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'mt-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="c-fullName">Full Name *</Label>
          <Input id="c-fullName" className={inputCls} value={form.fullName} onChange={set('fullName')} required disabled={loading} />
        </div>
        <div>
          <Label htmlFor="c-email">Email *</Label>
          <Input id="c-email" type="email" className={inputCls} value={form.email} onChange={set('email')} required disabled={loading} />
        </div>
        <div>
          <Label htmlFor="c-password">Password *</Label>
          <PasswordInput id="c-password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} disabled={loading} />
          <PasswordStrength password={form.password} />
        </div>
        <div>
          <Label htmlFor="c-confirmPassword">Confirm Password *</Label>
          <PasswordInput id="c-confirmPassword" value={form.confirmPassword} onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="c-firstName">First Name</Label>
          <Input id="c-firstName" className={inputCls} value={form.firstName} onChange={set('firstName')} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="c-lastName">Last Name</Label>
          <Input id="c-lastName" className={inputCls} value={form.lastName} onChange={set('lastName')} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="c-phoneNumber">Phone Number</Label>
          <Input id="c-phoneNumber" type="tel" className={inputCls} value={form.phoneNumber} onChange={set('phoneNumber')} disabled={loading} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="c-addressLine1">Address Line 1</Label>
          <Input id="c-addressLine1" className={inputCls} value={form.addressLine1} onChange={set('addressLine1')} disabled={loading} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="c-addressLine2">Address Line 2</Label>
          <Input id="c-addressLine2" className={inputCls} value={form.addressLine2} onChange={set('addressLine2')} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="c-city">City</Label>
          <Input id="c-city" className={inputCls} value={form.city} onChange={set('city')} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="c-state">State / Region</Label>
          <Input id="c-state" className={inputCls} value={form.state} onChange={set('state')} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="c-pincode">Pincode</Label>
          <Input id="c-pincode" className={inputCls} value={form.pincode} onChange={set('pincode')} disabled={loading} />
        </div>
        <div>
          <Label htmlFor="c-country">Country</Label>
          <Input id="c-country" className={inputCls} value={form.country} onChange={set('country')} disabled={loading} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="c-sportId">Sport</Label>
          <select
            id="c-sportId"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.sportId}
            onChange={set('sportId')}
            disabled={loading}
          >
            <option value="">Select sport</option>
            {sports.map((sport) => (
              <option key={sport.sportId} value={String(sport.sportId)}>
                {sport.sportName}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="coach-profileImage">Profile Picture</Label>
          <Input
            id="coach-profileImage"
            type="file"
            accept="image/*"
            className={inputCls}
            disabled={loading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const upload = await uploadSignupProfileImageApi(file);
                setForm((f) => ({ ...f, profileImage: upload.imageUrl }));
              } catch {
                setError('Unable to upload selected image. Please try another file.');
              }
            }}
          />
          {form.profileImage ? (
            <img
              src={form.profileImage}
              alt="Coach profile preview"
              className="mt-2 h-16 w-16 rounded-md object-cover bg-muted"
            />
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              id="scout-consent"
              type="checkbox"
              checked={form.consentGiven}
              onChange={(e) => setForm((f) => ({ ...f, consentGiven: e.target.checked }))}
              disabled={loading}
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
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : 'Sign Up as Scout'}
      </Button>
    </form>
  );
}

// ─── Main Signup Page ─────────────────────────────────────────────────────
type SignupRole = 'Player' | 'Scout';

const Signup = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<SignupRole | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sports, setSports] = useState<Sport[]>([]);

  useEffect(() => {
    const loadSports = async () => {
      try {
        const data = await fetchSportsApi();
        setSports(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load sports for signup', err);
        setSports([]);
      }
    };

    void loadSports();
  }, []);

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Registration Submitted!</h2>
            <p className="text-muted-foreground">
              You will receive a confirmation email after admin approval.
            </p>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-center">Create an Account</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-primary underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </CardHeader>

        <CardContent>
          {/* Role selector */}
          {!role && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground text-sm mb-6">
                I want to sign up as a...
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('Player')}
                  className="border-2 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <span className="text-4xl">⚽</span>
                  <span className="font-semibold text-lg">Player</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Register as a football player
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('Scout')}
                  className="border-2 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <span className="text-4xl">🏆</span>
                  <span className="font-semibold text-lg">Scout</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Register as a coach or staff member
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Forms */}
          {role && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setRole(null)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
                <span className="text-sm font-medium">
                  Sign up as{' '}
                  <span className="text-primary font-semibold">{role}</span>
                </span>
              </div>

              {role === 'Player' && (
                <PlayerSignupForm onSuccess={() => setSubmitted(true)} sports={sports} />
              )}
              {role === 'Scout' && (
                <ScoutSignupForm onSuccess={() => setSubmitted(true)} sports={sports} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
