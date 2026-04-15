import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Brain, Calendar, TrendingUp, AlertTriangle, Target, Clock, CheckCircle } from 'lucide-react';
import { generateAiPlanApi, getLatestAiPlanApi, getAiPlanHistoryApi } from '@/services/apiService';
import { AiPlanResponse, AiPlanHistoryResponse } from '@/types';
import { useAppContext } from '@/context/PlayerContext';
import { getRatingCategories } from '@/lib/playerUtils';
import { toast } from 'sonner';

interface AiPlanModuleProps {
  playerId: string;
}

export const AiPlanModule = ({ playerId }: AiPlanModuleProps) => {
  const { players, sportActivities } = useAppContext();
  const [currentPlan, setCurrentPlan] = useState<AiPlanResponse | null>(null);
  const [planHistory, setPlanHistory] = useState<AiPlanResponse[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    skillType: '',
    currentLevel: 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced',
    targetLevel: 'Advanced' as 'Beginner' | 'Intermediate' | 'Advanced',
    durationWeeks: '4',
    trainingDaysPerWeek: '3',
    sessionDurationMinutes: '45',
    hasInjury: false,
    injuryDetails: ''
  });

  const player = useMemo(
    () => players.find(p => String(p.id) === String(playerId)),
    [players, playerId]
  );

  const skillTypeOptions = useMemo(() => {
    if (!player?.sportId) {
      return getRatingCategories([]).map(c => c.label);
    }

    const activities = sportActivities.filter(a => a.sportId === player.sportId);
    return getRatingCategories(activities).map(c => c.label);
  }, [player?.sportId, sportActivities]);

  useEffect(() => {
    if (!configForm.skillType && skillTypeOptions.length > 0) {
      setConfigForm(prev => ({ ...prev, skillType: skillTypeOptions[0] }));
    }
  }, [skillTypeOptions, configForm.skillType]);

  useEffect(() => {
    // Check if this player has ever generated a plan (using localStorage)
    const hasPlanFlag = localStorage.getItem(`has-ai-plan-${playerId}`);
    
    if (hasPlanFlag === 'true') {
      // Plan exists, load it
      const loadPlans = async () => {
        setIsLoading(true);
        try {
          try {
            const plan = await getLatestAiPlanApi(playerId);
            setCurrentPlan(plan);
            setSelectedVersion(plan.version);
          } catch {
            setCurrentPlan(null);
          }

          try {
            const history = await getAiPlanHistoryApi(playerId);
            setPlanHistory(history.plans);
          } catch {
            setPlanHistory([]);
          }
        } finally {
          setIsLoading(false);
        }
      };
      loadPlans();
    } else {
      // No plan has been generated yet, don't make any API calls
      setIsLoading(false);
    }
  }, [playerId]);

  const loadPlanHistory = async () => {
    try {
      const history = await getAiPlanHistoryApi(playerId);
      setPlanHistory(history.plans);
    } catch {
      setPlanHistory([]);
    }
  };



  const handleGeneratePlan = async () => {
    if (!configForm.skillType) {
      toast.error('Please select a skill type.');
      return;
    }

    const days = Number(configForm.trainingDaysPerWeek);
    if (Number.isNaN(days) || days < 1 || days > 7) {
      toast.error('Training days per week must be between 1 and 7.');
      return;
    }

    if (configForm.hasInjury && !configForm.injuryDetails.trim()) {
      toast.error('Please provide injury details when injury is marked as yes.');
      return;
    }

    setIsGenerating(true);
    try {
      const newPlan = await generateAiPlanApi(playerId, {
        skillType: configForm.skillType,
        currentLevel: configForm.currentLevel,
        targetLevel: configForm.targetLevel,
        durationWeeks: Number(configForm.durationWeeks),
        trainingDaysPerWeek: days,
        sessionDurationMinutes: Number(configForm.sessionDurationMinutes),
        hasInjury: configForm.hasInjury,
        injuryDetails: configForm.hasInjury ? configForm.injuryDetails.trim() : undefined
      });
      // Mark that this player has a generated plan
      localStorage.setItem(`has-ai-plan-${playerId}`, 'true');
      setCurrentPlan(newPlan);
      setSelectedVersion(newPlan.version);
      await loadPlanHistory(); // Refresh history
      setIsConfigOpen(false);
      toast.success('AI development plan generated successfully!');
    } catch (error) {
      toast.error('Failed to generate AI plan. Please try again.');
      console.error('Error generating AI plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVersionChange = (version: string) => {
    const versionNum = parseInt(version);
    const selectedPlan = planHistory.find(p => p.version === versionNum);
    if (selectedPlan) {
      setCurrentPlan(selectedPlan);
      setSelectedVersion(versionNum);
    }
  };

  const getDisplayedPlan = () => {
    if (selectedVersion && planHistory.length > 0) {
      return planHistory.find(p => p.version === selectedVersion) || currentPlan;
    }
    return currentPlan;
  };

  const displayedPlan = getDisplayedPlan();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading AI plans...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Generate Button and Version Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <CardTitle>AI Development Plan</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              {planHistory.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Version:</span>
                  <Select value={selectedVersion?.toString()} onValueChange={handleVersionChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {planHistory.map(plan => (
                        <SelectItem key={plan.planId} value={plan.version.toString()}>
                          Version {plan.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
              )}
              <Button
                onClick={() => setIsConfigOpen(true)}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate AI Plan'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate AI Development Plan</DialogTitle>
            <DialogDescription>Configure training inputs before generating the plan.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Skill Type</Label>
              <Select
                value={configForm.skillType}
                onValueChange={v => setConfigForm(prev => ({ ...prev, skillType: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                <SelectContent>
                  {skillTypeOptions.map(skill => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Duration</Label>
              <Select
                value={configForm.durationWeeks}
                onValueChange={v => setConfigForm(prev => ({ ...prev, durationWeeks: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 weeks</SelectItem>
                  <SelectItem value="4">4 weeks</SelectItem>
                  <SelectItem value="8">8 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Current Level</Label>
              <Select
                value={configForm.currentLevel}
                onValueChange={v => setConfigForm(prev => ({ ...prev, currentLevel: v as 'Beginner' | 'Intermediate' | 'Advanced' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Level</Label>
              <Select
                value={configForm.targetLevel}
                onValueChange={v => setConfigForm(prev => ({ ...prev, targetLevel: v as 'Beginner' | 'Intermediate' | 'Advanced' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Training Days per Week</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={configForm.trainingDaysPerWeek}
                onChange={e => setConfigForm(prev => ({ ...prev, trainingDaysPerWeek: e.target.value }))}
              />
            </div>

            <div>
              <Label>Session Duration</Label>
              <Select
                value={configForm.sessionDurationMinutes}
                onValueChange={v => setConfigForm(prev => ({ ...prev, sessionDurationMinutes: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 mins</SelectItem>
                  <SelectItem value="45">45 mins</SelectItem>
                  <SelectItem value="60">60 mins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="has-injury">Has Injury</Label>
              <Switch
                id="has-injury"
                checked={configForm.hasInjury}
                onCheckedChange={v => setConfigForm(prev => ({ ...prev, hasInjury: v }))}
              />
            </div>

            {configForm.hasInjury && (
              <div className="col-span-2">
                <Label>Injury Details</Label>
                <Textarea
                  rows={3}
                  value={configForm.injuryDetails}
                  onChange={e => setConfigForm(prev => ({ ...prev, injuryDetails: e.target.value }))}
                  placeholder="Describe injury type, area, and current recovery status"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsConfigOpen(false)} disabled={isGenerating}>Cancel</Button>
            <Button onClick={handleGeneratePlan} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                'Generate Plan'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan Content */}
      {displayedPlan ? (
        <div className="grid gap-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{displayedPlan.plan.summary}</p>
            </CardContent>
          </Card>

          {/* Strengths and Weaknesses */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(displayedPlan.plan.strengths || []).map((strength, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">Weaknesses</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(displayedPlan.plan.weaknesses || []).map((weakness, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      {weakness}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Trend Analysis and Injury Risks */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trend Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{displayedPlan.plan.trend_analysis}</p>
              </CardContent>
            </Card>

            {displayedPlan.plan.injury_risks && displayedPlan.plan.injury_risks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Injury Risks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(displayedPlan.plan.injury_risks || []).map((risk, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Improvements from Last Plan */}
          {displayedPlan.plan.improvements_from_last_plan && displayedPlan.plan.improvements_from_last_plan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Improvements from Last Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(displayedPlan.plan.improvements_from_last_plan || []).map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Development Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(displayedPlan.plan.timeline_weeks || {}).map(([week, goal]) => (
                  <div key={week} className="border rounded-lg p-4">
                    <div className="font-semibold text-sm text-muted-foreground">Week {week}</div>
                    <div className="text-sm mt-1">{goal}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skill Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Skill Development Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(displayedPlan.plan.skill_plan || {}).map(([skill, activities]) => (
                  <div key={skill} className="border rounded-lg p-4">
                    <h4 className="font-semibold capitalize mb-2">{skill.replace(/([A-Z])/g, ' $1').trim()}</h4>
                    <ul className="space-y-1">
                      {Array.isArray(activities) && activities.map((activity, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {activity}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Training Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-7 gap-4">
                {Object.entries(displayedPlan.plan.weekly_schedule || {}).map(([day, activities]) => (
                  <div key={day} className="border rounded-lg p-4">
                    <h4 className="font-semibold capitalize text-center mb-2">{day}</h4>
                    <ul className="space-y-1">
                      {Array.isArray(activities) && activities.map((activity, index) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          • {activity}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Tracking and Recommendations */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(displayedPlan.plan.performance_tracking || []).map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(displayedPlan.plan.recommendations || []).map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Metadata */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Version {displayedPlan.version}</span>
                <span>Generated on {new Date(displayedPlan.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No AI Development Plan Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Generate an AI-powered development plan to get personalized training recommendations
              based on this player's reviews, notes, and performance data.
            </p>
            <Button onClick={() => setIsConfigOpen(true)} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate First AI Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};