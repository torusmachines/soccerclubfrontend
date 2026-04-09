import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePlayerContext } from '@/context/PlayerContext';
import { matchPlayers } from '@/lib/playerUtils';
import { MatchCriteria, RATING_CATEGORIES } from '@/types';
import { StarRating } from '@/components/StarRating';
import { ContractBadge } from '@/components/ContractBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, RotateCcw, Printer } from 'lucide-react';
import jsPDF from 'jspdf';

const MatchingEngine = () => {
  const { players, reviews, playerPositions } = usePlayerContext();
  const [criteria, setCriteria] = useState<MatchCriteria>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const results = useMemo(() => {
    if (!hasSearched) return [];
    return matchPlayers(players, reviews, criteria);
  }, [players, reviews, criteria, hasSearched]);

  const updateCriteria = (key: string, value: any) => setCriteria(prev => ({ ...prev, [key]: value }));
  const reset = () => { setCriteria({}); setHasSearched(false); };

  const getAppliedFilters = () => {
    const filters: string[] = [];
    if (criteria.position) filters.push(`Position: ${criteria.position}`);
    if (criteria.preferredFoot) filters.push(`Foot: ${criteria.preferredFoot}`);
    if (criteria.contractStatus) filters.push(`Contract: ${criteria.contractStatus}`);
    if (criteria.minOverall) filters.push(`Min Overall: ${criteria.minOverall}`);
    if (criteria.minPassing) filters.push(`Min Passing: ${criteria.minPassing}`);
    if (criteria.minShooting) filters.push(`Min Shooting: ${criteria.minShooting}`);
    return filters.length > 0 ? filters : ['No filters applied'];
  };

  // Draws a single player card onto the PDF at position y, returns the new y
  const drawPlayerCard = (pdf: jsPDF, result: any, y: number, margin: number, contentWidth: number): number => {
    const cardHeight = 36;
    const x = margin;

    // Card background + border
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, contentWidth, cardHeight, 2, 2, 'FD');

    // ── Left: name + subtitle ──
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(result.player.fullName, x + 4, y + 8);

    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `${result.player.currentClub}  ·  ${result.player.position}  ·  ${result.player.preferredFoot} foot`,
      x + 4,
      y + 14,
    );

    // ── Right: contract badge + match % ──
    const badgeColors: Record<string, { bg: [number,number,number]; text: [number,number,number] }> = {
      'Available':      { bg: [220, 252, 231], text: [22, 101, 52]  },
      'Expiring Soon':  { bg: [254, 249, 195], text: [133, 77, 14]  },
      'Active':         { bg: [219, 234, 254], text: [30, 64, 175]  },
    };
    const bc = badgeColors[result.contractStatus] ?? badgeColors['Active'];
    const badgeLabel = result.contractStatus;
    pdf.setFontSize(7);
    const badgeW = pdf.getTextWidth(badgeLabel) + 6;
    const badgeX = x + contentWidth - 4 - 28 - 4 - badgeW; // to the left of the score block
    pdf.setFillColor(...bc.bg);
    pdf.roundedRect(badgeX, y + 5, badgeW, 6, 1.5, 1.5, 'F');
    pdf.setTextColor(...bc.text);
    pdf.setFont('helvetica', 'bold');
    pdf.text(badgeLabel, badgeX + badgeW / 2, y + 9.2, { align: 'center' });

    // Match score block
    pdf.setTextColor(99, 102, 241); // indigo
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${result.matchScore}%`, x + contentWidth - 4, y + 10, { align: 'right' });
    pdf.setTextColor(148, 163, 184);
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text('match', x + contentWidth - 4, y + 15, { align: 'right' });

    // ── Divider ──
    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(0.3);
    pdf.line(x + 4, y + 19, x + contentWidth - 4, y + 19);

    // ── Rating categories ──
    const cats = RATING_CATEGORIES.slice(0, 4);
    const colW = contentWidth / 4;
    cats.forEach((cat, i) => {
      const cx = x + colW * i + colW / 2;
      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text(cat.label, cx, y + 25, { align: 'center' });
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(result.averageRatings[cat.key].toFixed(1), cx, y + 31, { align: 'center' });
    });

    return y + cardHeight + 4; // 4mm gap between cards
  };

  const exportPDF = () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      // ── Header bar ──
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageWidth, 18, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Player Matching Engine \u2014 Results', margin, 12);
      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      pdf.text(`Exported: ${dateStr}`, pageWidth - margin, 12, { align: 'right' });

      let y = 26;

      // ── Applied filters pill ──
      const filters = getAppliedFilters();
      const filterLineHeight = 5.5;
      const filterPadY = 4;
      // wrap long filter text across lines
      pdf.setFontSize(7.5);
      const filterStr = filters.join('   \u2022   ');
      const wrappedFilter = pdf.splitTextToSize(filterStr, contentWidth - 6);
      const pillH = filterPadY * 2 + wrappedFilter.length * filterLineHeight;
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(margin, y, contentWidth, pillH, 2, 2, 'F');
      pdf.setTextColor(71, 85, 105);
      pdf.setFont('helvetica', 'bold');
      pdf.text('APPLIED FILTERS', margin + 3, y + filterPadY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(wrappedFilter, margin + 3, y + filterPadY + filterLineHeight);
      y += pillH + 5;

      // ── Results count ──
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(8);
      pdf.text(`${results.length} player${results.length !== 1 ? 's' : ''} found`, margin, y);
      y += 7;

      // ── Player cards ──
      const cardHeight = 40; // conservative estimate for page-break check
      for (const result of results) {
        if (y + cardHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        y = drawPlayerCard(pdf, result, y, margin, contentWidth);
      }

      pdf.save('player-matching-results.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Matching Engine</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="no-print">
          <CardHeader><CardTitle className="text-sm">Search Criteria</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Position</Label>
              <Select value={criteria.position || 'any'} onValueChange={v => updateCriteria('position', v === 'any' ? undefined : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {playerPositions.map(p => <SelectItem key={p.positionId} value={p.positionCode}>{p.positionName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Laterality</Label>
              <Select value={criteria.preferredFoot || 'any'} onValueChange={v => updateCriteria('preferredFoot', v === 'any' ? undefined : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="Left">Left</SelectItem>
                  <SelectItem value="Right">Right</SelectItem>
                  <SelectItem value="Both">Ambidextrous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contract Status</Label>
              <Select value={criteria.contractStatus || 'any'} onValueChange={v => updateCriteria('contractStatus', v === 'any' ? undefined : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Min Overall Rating</Label>
              <Input type="number" min={1} max={5} step={0.5} value={criteria.minOverall || ''} onChange={e => updateCriteria('minOverall', Number(e.target.value) || undefined)} placeholder="1-5" />
            </div>
            <div>
              <Label>Min Passing</Label>
              <Input type="number" min={1} max={5} value={criteria.minPassing || ''} onChange={e => updateCriteria('minPassing', Number(e.target.value) || undefined)} placeholder="1-5" />
            </div>
            <div>
              <Label>Min Shooting</Label>
              <Input type="number" min={1} max={5} value={criteria.minShooting || ''} onChange={e => updateCriteria('minShooting', Number(e.target.value) || undefined)} placeholder="1-5" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setHasSearched(true)}><Target size={14} className="mr-1" /> Search</Button>
              <Button variant="outline" onClick={reset}><RotateCcw size={14} /></Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {hasSearched ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{results.length} player{results.length !== 1 ? 's' : ''} found</p>
                {results.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportPDF}
                    disabled={isExporting}
                  >
                    <Printer size={14} className="mr-1" />
                    {isExporting ? 'Exporting…' : 'Export PDF'}
                  </Button>
                )}
              </div>

              {/* Visible result cards */}
              {results.map(result => (
                <Link key={result.player.id} to={`/players/${result.player.id}`}>
                  <Card className="hover:border-primary/30 transition-all cursor-pointer mb-3">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{result.player.fullName}</h3>
                          <p className="text-xs text-muted-foreground">{result.player.currentClub} · {result.player.position} · {result.player.preferredFoot} foot</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <ContractBadge status={result.contractStatus} />
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{result.matchScore}%</p>
                            <p className="text-[10px] text-muted-foreground">match</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {RATING_CATEGORIES.slice(0, 4).map(cat => (
                          <div key={cat.key} className="text-center">
                            <p className="text-[10px] text-muted-foreground">{cat.label}</p>
                            <p className="text-sm font-medium">{result.averageRatings[cat.key].toFixed(1)}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {results.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No players match your criteria</p>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Target size={48} className="mx-auto mb-4 opacity-30" />
              <p>Set your criteria and search for matching players</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchingEngine;














// import { useState, useMemo } from 'react';
// import { Link } from 'react-router-dom';
// import { usePlayerContext } from '@/context/PlayerContext';
// import { matchPlayers } from '@/lib/playerUtils';
// import { POSITIONS, MatchCriteria, RATING_CATEGORIES } from '@/types';
// import { StarRating } from '@/components/StarRating';
// import { ContractBadge } from '@/components/ContractBadge';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Target, RotateCcw, Printer } from 'lucide-react';

// const MatchingEngine = () => {
//   const { players, reviews } = usePlayerContext();
//   const [criteria, setCriteria] = useState<MatchCriteria>({});
//   const [hasSearched, setHasSearched] = useState(false);

//   const results = useMemo(() => {
//     if (!hasSearched) return [];
//     return matchPlayers(players, reviews, criteria);
//   }, [players, reviews, criteria, hasSearched]);

//   const updateCriteria = (key: string, value: any) => setCriteria(prev => ({ ...prev, [key]: value }));
//   const reset = () => { setCriteria({}); setHasSearched(false); };

//   return (
//     <div className="space-y-6 animate-fade-in">
//       <h1 className="text-2xl font-bold">Matching Engine</h1>

//       <div className="grid lg:grid-cols-3 gap-6">
//         <Card className="no-print">
//           <CardHeader><CardTitle className="text-sm">Search Criteria</CardTitle></CardHeader>
//           <CardContent className="space-y-4">
//             <div>
//               <Label>Position</Label>
//               <Select value={criteria.position || 'any'} onValueChange={v => updateCriteria('position', v === 'any' ? undefined : v)}>
//                 <SelectTrigger><SelectValue /></SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="any">Any</SelectItem>
//                   {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
//                 </SelectContent>
//               </Select>
//             </div>
//             <div>
//               <Label>Preferred Foot</Label>
//               <Select value={criteria.preferredFoot || 'any'} onValueChange={v => updateCriteria('preferredFoot', v === 'any' ? undefined : v)}>
//                 <SelectTrigger><SelectValue /></SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="any">Any</SelectItem>
//                   <SelectItem value="Left">Left</SelectItem>
//                   <SelectItem value="Right">Right</SelectItem>
//                   <SelectItem value="Both">Both</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div>
//               <Label>Contract Status</Label>
//               <Select value={criteria.contractStatus || 'any'} onValueChange={v => updateCriteria('contractStatus', v === 'any' ? undefined : v)}>
//                 <SelectTrigger><SelectValue /></SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="any">Any</SelectItem>
//                   <SelectItem value="Active">Active</SelectItem>
//                   <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
//                   <SelectItem value="Available">Available</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div>
//               <Label>Min Overall Rating</Label>
//               <Input type="number" min={1} max={5} step={0.5} value={criteria.minOverall || ''} onChange={e => updateCriteria('minOverall', Number(e.target.value) || undefined)} placeholder="1-5" />
//             </div>
//             <div>
//               <Label>Min Passing</Label>
//               <Input type="number" min={1} max={5} value={criteria.minPassing || ''} onChange={e => updateCriteria('minPassing', Number(e.target.value) || undefined)} placeholder="1-5" />
//             </div>
//             <div>
//               <Label>Min Shooting</Label>
//               <Input type="number" min={1} max={5} value={criteria.minShooting || ''} onChange={e => updateCriteria('minShooting', Number(e.target.value) || undefined)} placeholder="1-5" />
//             </div>
//             <div className="flex gap-2">
//               <Button className="flex-1" onClick={() => setHasSearched(true)}><Target size={14} className="mr-1" /> Search</Button>
//               <Button variant="outline" onClick={reset}><RotateCcw size={14} /></Button>
//             </div>
//           </CardContent>
//         </Card>

//         <div className="lg:col-span-2 space-y-4">
//           {hasSearched ? (
//             <>
//               <div className="flex items-center justify-between">
//                 <p className="text-sm text-muted-foreground">{results.length} player{results.length !== 1 ? 's' : ''} found</p>
//                 {results.length > 0 && (
//                   <Button variant="outline" size="sm" onClick={() => window.print()}>
//                     <Printer size={14} className="mr-1" /> Export PDF
//                   </Button>
//                 )}
//               </div>
//               {results.map(result => (
//                 <Link key={result.player.id} to={`/players/${result.player.id}`}>
//                   <Card className="hover:border-primary/30 transition-all cursor-pointer mb-3">
//                     <CardContent className="p-4">
//                       <div className="flex items-center justify-between mb-2">
//                         <div>
//                           <h3 className="font-semibold">{result.player.fullName}</h3>
//                           <p className="text-xs text-muted-foreground">{result.player.currentClub} · {result.player.position} · {result.player.preferredFoot} foot</p>
//                         </div>
//                         <div className="flex items-center gap-3">
//                           <ContractBadge status={result.contractStatus} />
//                           <div className="text-right">
//                             <p className="text-2xl font-bold text-primary">{result.matchScore}%</p>
//                             <p className="text-[10px] text-muted-foreground">match</p>
//                           </div>
//                         </div>
//                       </div>
//                       <div className="grid grid-cols-4 gap-2 mt-3">
//                         {RATING_CATEGORIES.slice(0, 4).map(cat => (
//                           <div key={cat.key} className="text-center">
//                             <p className="text-[10px] text-muted-foreground">{cat.label}</p>
//                             <p className="text-sm font-medium">{result.averageRatings[cat.key].toFixed(1)}</p>
//                           </div>
//                         ))}
//                       </div>
//                     </CardContent>
//                   </Card>
//                 </Link>
//               ))}
//               {results.length === 0 && (
//                 <p className="text-center text-muted-foreground py-8">No players match your criteria</p>
//               )}
//             </>
//           ) : (
//             <div className="text-center py-20 text-muted-foreground">
//               <Target size={48} className="mx-auto mb-4 opacity-30" />
//               <p>Set your criteria and search for matching players</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MatchingEngine;
