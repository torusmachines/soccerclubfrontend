// Type guard for ThemeKey
function isThemeKey(key: any): key is ThemeKey {
  return typeof key === 'string' && Object.keys(THEMES).includes(key);
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { fetchCompanyProfile, updateCompanyProfile, uploadCompanyLogoApi } from '@/services/apiService';
import { ThemeSelector } from '@/components/ThemeSelector';
import { THEMES, ThemeKey, applyTheme } from '@/lib/themes';
import { getContractExpiringMonths, setContractExpiringMonths as saveContractExpiringMonths } from '@/lib/settingsUtils';

const CompanyProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Basic Info
  const [companyName, setCompanyName] = useState('');
  const [shortName, setShortName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<ThemeKey>('classic');

  // Contact Info
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');

  // Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [areaLocality, setAreaLocality] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Organization Details
  const [organizationType, setOrganizationType] = useState('');
  const [sportType, setSportType] = useState('');

  // Contract Settings
  const [contractExpiringMonths, setContractExpiringMonths] = useState(6);

  // Social Media
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  useEffect(() => {
    fetchCompanyProfile().then((res) => {
      setCompanyName(res.companyName || '');
      setShortName(res.shortName || '');
      setTagline(res.tagline || '');
      setDescription(res.description || '');
      setFoundedYear(res.foundedYear ? String(res.foundedYear) : '');
      setLogoUrl(res.logoUrl || '');
      setPrimaryColor(isThemeKey(res.primaryColor) ? res.primaryColor : 'classic');
      setEmail(res.email || '');
      setPhoneNumber(res.phoneNumber || '');
      setAlternatePhone(res.alternatePhone || '');
      setAddressLine1(res.addressLine1 || '');
      setAddressLine2(res.addressLine2 || '');
      setAreaLocality(res.areaLocality || '');
      setCity(res.city || '');
      setDistrict(res.district || '');
      setState(res.state || '');
      setCountry(res.country || '');
      setPostalCode(res.postalCode || '');
      setOrganizationType(res.organizationType || '');
      setSportType(res.sportType || '');
      setFacebookUrl(res.facebookUrl || '');
      setInstagramUrl(res.instagramUrl || '');
      setTwitterUrl(res.twitterUrl || '');
      setLinkedinUrl(res.linkedinUrl || '');
      setYoutubeUrl(res.youtubeUrl || '');
      setContractExpiringMonths(res.contractExpiringMonths ?? getContractExpiringMonths());
    }).catch(() => {
      // ignore
      setContractExpiringMonths(getContractExpiringMonths());
    }).finally(() => setLoading(false));
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadCompanyLogoApi(file);
      setLogoUrl(res.logoUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCompanyProfile({
        companyName,
        shortName,
        tagline,
        description,
        foundedYear: foundedYear ? parseInt(foundedYear) : null,
        logoUrl,
        primaryColor,
        email,
        phoneNumber,
        alternatePhone,
        addressLine1,
        addressLine2,
        areaLocality,
        city,
        district,
        state,
        country,
        postalCode,
        organizationType,
        sportType,
        contractExpiringMonths,
        facebookUrl,
        instagramUrl,
        twitterUrl,
        linkedinUrl,
        youtubeUrl
      });
      saveContractExpiringMonths(contractExpiringMonths);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;

  // return (
  //   <div className="max-w-3xl">
  //     <Card>
  //       <CardHeader>
  //         <CardTitle>Company Profile</CardTitle>
  //       </CardHeader>
  //       <CardContent className="space-y-6">
  //         {/* Basic Info */}
  //         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  //           <div>
  //             <Label>Upload Logo</Label>
  //             <div className="flex items-center gap-4 mt-2">
  //               <div className="w-28 h-16 bg-muted rounded overflow-hidden flex items-center justify-center">
  //                 {logoUrl ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain" /> : <span className="text-sm text-muted-foreground">No logo</span>}
  //               </div>
  //               <input type="file" accept="image/*" onChange={handleFile} />
  //             </div>
  //           </div>
  //           <div>
  //             <Label>Theme Color</Label>
  //             <select className="w-full h-10 border rounded px-2" value={primaryColor} onChange={e => setPrimaryColor(e.target.value as ThemeKey)}>
  //               {Object.entries(THEMES).map(([key, t]) => (
  //                 <option key={key} value={key}>{t.label}</option>
  //               ))}
  //             </select>
  //           </div>
  //           <div>
  //             <Label>Company Name</Label>
  //             <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Short Name</Label>
  //             <Input value={shortName} onChange={e => setShortName(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Tagline</Label>
  //             <Input value={tagline} onChange={e => setTagline(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Founded Year</Label>
  //             <Input type="number" value={foundedYear} onChange={e => setFoundedYear(e.target.value)} />
  //           </div>
  //           <div className="md:col-span-2">
  //             <Label>Description</Label>
  //             <Textarea value={description} onChange={e => setDescription(e.target.value)} />
  //           </div>
  //         </div>

  //         {/* Contact Info */}
  //         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  //           <div>
  //             <Label>Email</Label>
  //             <Input value={email} onChange={e => setEmail(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Phone Number</Label>
  //             <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Alternate Phone</Label>
  //             <Input value={alternatePhone} onChange={e => setAlternatePhone(e.target.value)} />
  //           </div>
  //         </div>

  //         {/* Address */}
  //         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  //           <div>
  //             <Label>Address Line 1</Label>
  //             <Input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Address Line 2</Label>
  //             <Input value={addressLine2} onChange={e => setAddressLine2(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Area/Locality</Label>
  //             <Input value={areaLocality} onChange={e => setAreaLocality(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>City</Label>
  //             <Input value={city} onChange={e => setCity(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>District</Label>
  //             <Input value={district} onChange={e => setDistrict(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>State</Label>
  //             <Input value={state} onChange={e => setState(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Country</Label>
  //             <Input value={country} onChange={e => setCountry(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Postal Code</Label>
  //             <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} />
  //           </div>
  //         </div>

  //         {/* Organization Details */}
  //         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  //           <div>
  //             <Label>Organization Type</Label>
  //             <Input value={organizationType} onChange={e => setOrganizationType(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Sport Type</Label>
  //             <Input value={sportType} onChange={e => setSportType(e.target.value)} />
  //           </div>
  //         </div>

  //         {/* Social Media */}
  //         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  //           <div>
  //             <Label>Facebook URL</Label>
  //             <Input value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Instagram URL</Label>
  //             <Input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>Twitter URL</Label>
  //             <Input value={twitterUrl} onChange={e => setTwitterUrl(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>LinkedIn URL</Label>
  //             <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} />
  //           </div>
  //           <div>
  //             <Label>YouTube URL</Label>
  //             <Input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
  //           </div>
  //         </div>

  //         <div className="flex gap-2 mt-6">
  //           <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
  //           <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
  //         </div>
  //       </CardContent>
  //     </Card>
  //   </div>
  // );
  return (
    <div className="max-w-5xl mx-auto py-6">
      <Card className="shadow-lg border rounded-2xl">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-2xl font-semibold">🏢 Company Profile</CardTitle>
        </CardHeader>

        <CardContent className="space-y-10 pt-6">

          {/* ================= BASIC INFO ================= */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Logo Upload */}
              <div className="md:col-span-1">
                <Label className="mb-2 block">Company Logo</Label>
                <div className="border rounded-xl p-4 flex flex-col items-center justify-center gap-3 bg-muted/40">
                  <div className="w-32 h-20 bg-white rounded-md overflow-hidden flex items-center justify-center border">
                    {logoUrl ? (
                      <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No Logo</span>
                    )}
                  </div>
                  <Input type="file" accept="image/*" onChange={handleFile} />
                </div>
              </div>

              {/* Theme */}
              <div>
                <Label className="mb-2 block">Theme Color</Label>
                <ThemeSelector/>
              </div>
              

              {/* Founded Year */}
              <div>
                <Label>Founded Year</Label>
                <Input
                  type="number"
                  value={foundedYear}
                  onChange={e => setFoundedYear(e.target.value)}
                />
              </div>

              <div>
                <Label>Contract Expiring Soon (months)</Label>
                <Input
                  type="number"
                  min={1}
                  max={36}
                  value={contractExpiringMonths}
                  onChange={e => setContractExpiringMonths(Number(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground mt-1">Players with contract end in this many months are marked Expiring Soon and will generate auto contract tasks.</p>
              </div>

              <div>
                <Label>Company Name</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
              </div>

              <div>
                <Label>Short Name</Label>
                <Input value={shortName} onChange={e => setShortName(e.target.value)} />
              </div>

              <div>
                <Label>Tagline</Label>
                <Input value={tagline} onChange={e => setTagline(e.target.value)} />
              </div>

              <div className="md:col-span-3">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} />
              </div>

            </div>
          </div>

          {/* ================= CONTACT ================= */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
              </div>

              <div>
                <Label>Alternate Phone</Label>
                <Input value={alternatePhone} onChange={e => setAlternatePhone(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ================= ADDRESS ================= */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Address</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <Label>Address Line 1</Label>
                <Input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} />
              </div>

              <div>
                <Label>Address Line 2</Label>
                <Input value={addressLine2} onChange={e => setAddressLine2(e.target.value)} />
              </div>

              <div>
                <Label>Area / Locality</Label>
                <Input value={areaLocality} onChange={e => setAreaLocality(e.target.value)} />
              </div>

              <div>
                <Label>City</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} />
              </div>

              <div>
                <Label>District</Label>
                <Input value={district} onChange={e => setDistrict(e.target.value)} />
              </div>

              <div>
                <Label>State</Label>
                <Input value={state} onChange={e => setState(e.target.value)} />
              </div>

              <div>
                <Label>Country</Label>
                <Input value={country} onChange={e => setCountry(e.target.value)} />
              </div>

              <div>
                <Label>Postal Code</Label>
                <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ================= ORGANIZATION ================= */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Organization Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Organization Type</Label>
                <Input value={organizationType} onChange={e => setOrganizationType(e.target.value)} />
              </div>

              <div>
                <Label>Sport Type</Label>
                <Input value={sportType} onChange={e => setSportType(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ================= SOCIAL ================= */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Social Media</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input placeholder="Facebook URL" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} />
              <Input placeholder="Instagram URL" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} />
              <Input placeholder="Twitter URL" value={twitterUrl} onChange={e => setTwitterUrl(e.target.value)} />
              <Input placeholder="LinkedIn URL" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} />
              <Input placeholder="YouTube URL" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
            </div>
          </div>

          {/* ================= ACTIONS ================= */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyProfile;
