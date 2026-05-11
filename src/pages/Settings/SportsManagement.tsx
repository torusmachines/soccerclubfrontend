import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAppContext } from '@/context/PlayerContext';
import { fetchSportActivitiesApi, fetchPlayerPositionsBySportApi } from '@/services/apiService';
import { Sport, SportActivity } from '@/types';

const SportsManagement = () => {
  const { sports, sportActivities, playerPositions, addSport, updateSport, deleteSport, addSportActivity, updateSportActivity, deleteSportActivity, addPlayerPosition, updatePlayerPosition, deletePlayerPosition } = useAppContext();

  // Sport list search
  const [sportsSearch, setSportsSearch] = useState('');

  // Sport dialog state
  const [isSportDialogOpen, setIsSportDialogOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [sportName, setSportName] = useState('');
  const [originalSportName, setOriginalSportName] = useState('');
  
  // Parameters within sport form
  const [formParameters, setFormParameters] = useState<SportActivity[]>([]);
  const [editingParameterInForm, setEditingParameterInForm] = useState<SportActivity | null>(null);
  const [newParameterName, setNewParameterName] = useState('');
  // Positions within sport form
  const [formPositions, setFormPositions] = useState<any[]>([]);
  const [isPlayerPositionDialogOpen, setIsPlayerPositionDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<any | null>(null);
  const [positionCode, setPositionCode] = useState('');
  const [positionName, setPositionName] = useState('');
  const [positionDescription, setPositionDescription] = useState('');

  // Filtered sports for list
  const filteredSports = useMemo(() => 
    sports.filter(sport =>
      sport.sportName.toLowerCase().includes(sportsSearch.toLowerCase())
    ),
    [sports, sportsSearch]
  );

  // Get parameters for a specific sport
  const getParametersForSport = (sportId: number) => 
    sportActivities.filter(activity => activity.sportId === sportId);

  // Open add sport dialog
  const handleAddSport = () => {
    setEditingSport(null);
    setSportName('');
    setOriginalSportName('');
    setFormParameters([]);
    setEditingParameterInForm(null);
    setNewParameterName('');
    setIsSportDialogOpen(true);
  };

  // Open edit sport dialog
  const handleEditSport = (sport: Sport) => {
    setEditingSport(sport);
    setSportName(sport.sportName);
    setOriginalSportName(sport.sportName);
    setFormParameters(getParametersForSport(sport.sportId));
    // load positions associated with this sport from API
    (async () => {
      try {
        const positions = await fetchPlayerPositionsBySportApi(sport.sportId);
        setFormPositions(Array.isArray(positions) ? positions : []);
      } catch (err) {
        setFormPositions(playerPositions.filter(p => p.sportId === sport.sportId));
      }
    })();
    setEditingParameterInForm(null);
    setNewParameterName('');
    setIsSportDialogOpen(true);
  };

  // Save sport and sync activities
  const handleSaveSport = async () => {
    if (!sportName.trim()) return;

    try {
      if (editingSport) {
        // Update existing sport
        await updateSport({
          ...editingSport,
          sportName: sportName.trim()
        });
      } else {
        // Create new sport
        await addSport({
          sportName: sportName.trim(),
          createdAt: new Date().toISOString()
        });
      }
      
      // Handle parameters (existing API calls remain unchanged)
      // This is handled separately via parameter management functions
      
      setIsSportDialogOpen(false);
      setSportName('');
      setEditingSport(null);
      setFormParameters([]);
      setEditingParameterInForm(null);
      setNewParameterName('');
    } catch (err) {
      console.error('Error saving sport:', err);
    }
  };

  // Delete sport
  const handleDeleteSport = async (sportId: number) => {
    try {
      await deleteSport(sportId);
    } catch (err) {
      console.error('Error deleting sport:', err);
    }
  };

  // Add new parameter within form — save immediately via API
  const handleAddParameterInForm = async () => {
    if (!newParameterName.trim() || !editingSport) return;

    try {
      await addSportActivity({
        sportId: editingSport.sportId,
        activityName: newParameterName.trim(),
        createdAt: new Date().toISOString()
      } as unknown as SportActivity);

      // refresh parameters from API to ensure server state is authoritative
      const allActivities = await fetchSportActivitiesApi();
      setFormParameters(Array.isArray(allActivities) ? allActivities.filter(a => a.sportId === editingSport.sportId) : []);
      setNewParameterName('');
    } catch (err) {
      console.error('Error adding parameter:', err);
    }
  };

  // Positions handlers (only allow when editing an existing sport)
  const handleAddPositionInForm = () => {
    if (!positionCode.trim() || !positionName.trim() || !editingSport) return;

    setFormPositions([...formPositions, {
      positionId: '-1',
      positionCode: positionCode.trim(),
      positionName: positionName.trim(),
      description: positionDescription.trim(),
      sportId: editingSport.sportId,
      createdAt: new Date().toISOString(),
      createdBy: 'admin'
    }]);

    setPositionCode('');
    setPositionName('');
    setPositionDescription('');
  };

  const handleEditPositionInForm = (pos: any) => {
    setEditingPosition(pos);
    setPositionCode(pos.positionCode || '');
    setPositionName(pos.positionName || '');
    setPositionDescription(pos.description || '');
  };

  const handleSavePositionToApi = async (pos: any) => {
    try {
      if (pos.positionId === '-1') {
        // create
        await addPlayerPosition({
          positionId: '',
          positionCode: pos.positionCode,
          positionName: pos.positionName,
          description: pos.description,
          sportId: editingSport?.sportId,
          createdAt: pos.createdAt || new Date().toISOString(),
          createdBy: pos.createdBy || 'admin'
        });
      } else {
        await updatePlayerPosition({
          ...pos,
          positionCode: pos.positionCode,
          positionName: pos.positionName,
          description: pos.description,
          sportId: editingSport?.sportId
        });
      }
      // After successful add/update, refresh positions for this sport
      if (editingSport) {
        try {
          const updated = await fetchPlayerPositionsBySportApi(editingSport.sportId);
          setFormPositions(Array.isArray(updated) ? updated : []);
        } catch (err) {
          // ignore fetch error, keep local state
        }
      }
    } catch (err) {
      console.error('Error saving position:', err);
    }
  };

  const handleDeletePositionFromApi = async (positionId: string) => {
    try {
      await deletePlayerPosition(positionId);
      if (editingSport) {
        try {
          const updated = await fetchPlayerPositionsBySportApi(editingSport.sportId);
          setFormPositions(Array.isArray(updated) ? updated : []);
        } catch (err) {
          setFormPositions(prev => prev.filter(p => p.positionId !== positionId));
        }
      } else {
        setFormPositions(prev => prev.filter(p => p.positionId !== positionId));
      }
    } catch (err) {
      console.error('Error deleting position:', err);
    }
  };

  // Edit parameter within form
  const handleEditParameterInForm = (activity: SportActivity) => {
    setEditingParameterInForm(activity);
    setNewParameterName(activity.activityName);
  };

  // Update parameter in form — save only the edited parameter via API
  const handleUpdateParameterInForm = async () => {
    if (!newParameterName.trim() || !editingParameterInForm) return;

    const updatedName = newParameterName.trim();

    try {
      if (editingParameterInForm.activityId === -1) {
        // New temporary parameter: create it immediately
        await addSportActivity({
          sportId: editingParameterInForm.sportId,
          activityName: updatedName,
          createdAt: new Date().toISOString()
        } as unknown as SportActivity);

        // Refresh list from API
        if (editingSport) {
          const allActivities = await fetchSportActivitiesApi();
          setFormParameters(Array.isArray(allActivities) ? allActivities.filter(a => a.sportId === editingSport.sportId) : []);
        }
      } else {
        // Existing parameter: update only this one
        await updateSportActivity({
          ...editingParameterInForm,
          activityName: updatedName
        });

        // Refresh list from API for accuracy
        if (editingSport) {
          const allActivities = await fetchSportActivitiesApi();
          setFormParameters(Array.isArray(allActivities) ? allActivities.filter(a => a.sportId === editingSport.sportId) : []);
        } else {
          setFormParameters(formParameters.map(a => 
            a.activityId === editingParameterInForm.activityId
              ? { ...a, activityName: updatedName }
              : a
          ));
        }
      }

      setEditingParameterInForm(null);
      setNewParameterName('');
    } catch (err) {
      console.error('Error updating parameter:', err);
    }
  };

  // Remove parameter from form
  const handleRemoveParameterFromForm = (activityId: number) => {
    setFormParameters(formParameters.filter(a => a.activityId !== activityId));
    if (editingParameterInForm?.activityId === activityId) {
      setEditingParameterInForm(null);
      setNewParameterName('');
    }
  };

  // Save parameter to API
  const handleSaveParameterToApi = async (activity: SportActivity) => {
    try {
      if (activity.activityId === -1) {
        // New parameter
        await addSportActivity({
          sportId: activity.sportId,
          activityName: activity.activityName,
          createdAt: new Date().toISOString()
        });
      } else {
        // Update existing parameter
        await updateSportActivity({
          ...activity,
          activityName: activity.activityName
        });
      }
    } catch (err) {
      console.error('Error saving parameter:', err);
    }
  };

  // Delete parameter from API
  const handleDeleteParameterFromApi = async (activityId: number) => {
    try {
      await deleteSportActivity(activityId);
      // After successful delete, refresh from API
      if (editingSport) {
        const allActivities = await fetchSportActivitiesApi();
        setFormParameters(Array.isArray(allActivities) ? allActivities.filter(a => a.sportId === editingSport.sportId) : []);
      } else {
        setFormParameters(prev => prev.filter(p => p.activityId !== activityId));
      }
    } catch (err) {
      console.error('Error deleting parameter:', err);
    }
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Card className="shadow-lg border rounded-2xl">
          <CardHeader className="border-b pb-4 px-4 sm:px-6">
            <CardTitle className="text-2xl font-semibold">Sports Management</CardTitle>
            <p className="text-muted-foreground text-sm sm:text-base">Manage sports and their parameters for the scouting system.</p>
          </CardHeader>

          <CardContent className="space-y-6 pt-6 px-4 sm:px-6">
            {/* Search and Add Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search sports..."
                    value={sportsSearch}
                    onChange={(e) => setSportsSearch(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
              </div>
              <Dialog open={isSportDialogOpen} onOpenChange={setIsSportDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddSport} size="sm" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Sport
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl sm:text-2xl">{editingSport ? 'Edit Sport' : 'Add Sport'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Sport Name */}
                    <div>
                      <Label htmlFor="sportName" className="text-base font-semibold">Sport Name *</Label>
                      <Input
                        id="sportName"
                        value={sportName}
                        onChange={(e) => setSportName(e.target.value)}
                        placeholder="e.g., Football, Basketball, Tennis"
                        className="mt-2"
                      />
                    </div>

                    {editingSport && (
                      <Tabs defaultValue="parameters" className="space-y-4">
                        <TabsList>
                          <TabsTrigger value="parameters">Parameters</TabsTrigger>
                          <TabsTrigger value="positions">Positions</TabsTrigger>
                        </TabsList>

                        <TabsContent value="parameters">
                        {/* Parameters Section */}
                        <div className="border-t pt-6">
                          <h3 className="text-lg font-semibold mb-4">Parameters for {sportName || 'this Sport'}</h3>
                      
                      {/* Add Parameter Form */}
                      {editingSport && (
                        <div className="bg-muted/30 p-4 rounded-lg mb-4 space-y-3">
                          <Label htmlFor="newParameter" className="font-medium">Add new parameter</Label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              id="newParameter"
                              placeholder="Parameter name (e.g., Training, Match, Practice)"
                              value={newParameterName}
                              onChange={(e) => setNewParameterName(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddParameterInForm()}
                              className="flex-1"
                            />
                            <Button 
                              onClick={handleAddParameterInForm}
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                              disabled={!newParameterName.trim()}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Parameters List */}
                      {formParameters.length === 0 ? (
                        <div className="text-center py-8 bg-muted/20 rounded-lg">
                          <p className="text-muted-foreground text-sm">
                            {editingSport ? 'No parameters yet. Add one to get started!' : 'Create the sport first, then add parameters.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {formParameters.map((activity) => (
                            <div 
                              key={activity.activityId} 
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-md bg-muted/20"
                            >
                              {editingParameterInForm?.activityId === activity.activityId ? (
                                <div className="w-full flex flex-col sm:flex-row gap-2">
                                  <Input
                                    value={newParameterName}
                                    onChange={(e) => setNewParameterName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateParameterInForm()}
                                    className="flex-1"
                                  />
                                  <div className="flex gap-2 w-full sm:w-auto">
                                    <Button 
                                      onClick={handleUpdateParameterInForm}
                                      size="sm"
                                      className="flex-1 sm:flex-none"
                                    >
                                      Save
                                    </Button>
                                    <Button 
                                      onClick={() => {
                                        setEditingParameterInForm(null);
                                        setNewParameterName('');
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 sm:flex-none"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1">
                                    <div className="font-medium text-sm sm:text-base">{activity.activityName}</div>
                                    {activity.activityId === -1 && (
                                      <div className="text-xs text-amber-600">New (not saved yet)</div>
                                    )}
                                  </div>
                                  <div className="flex gap-1 w-full sm:w-auto">
                                    {editingSport && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditParameterInForm(activity)}
                                          className="flex-1 sm:flex-none"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              className="text-destructive hover:text-destructive flex-1 sm:flex-none"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Remove Parameter</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to remove "{activity.activityName}"?
                                                {activity.activityId !== -1 && ' This action will delete it from the database.'}
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={async () => {
                                                  handleRemoveParameterFromForm(activity.activityId);
                                                  if (activity.activityId !== -1) {
                                                    await handleDeleteParameterFromApi(activity.activityId);
                                                  }
                                                }}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              >
                                                Remove
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                        </div>
                      </TabsContent>

                      <TabsContent value="positions">
                        <div className="border-t pt-6">
                          <h3 className="text-lg font-semibold mb-4">Positions for {sportName || 'this Sport'}</h3>

                          {!editingSport ? (
                            <div className="text-center py-8 bg-muted/20 rounded-lg">
                              <p className="text-muted-foreground text-sm">Create the sport first, then add positions.</p>
                            </div>
                          ) : (
                            <>
                              <div className="bg-muted/30 p-4 rounded-lg mb-4 space-y-3">
                                <Label htmlFor="positionCode" className="font-medium">Add new position</Label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Input
                                    id="positionCode"
                                    placeholder="Code (e.g., GK, CB)"
                                    value={positionCode}
                                    onChange={(e) => setPositionCode(e.target.value)}
                                    className="w-32"
                                  />
                                  <Input
                                    placeholder="Position name"
                                    value={positionName}
                                    onChange={(e) => setPositionName(e.target.value)}
                                    className="flex-1"
                                  />
                                  <Textarea
                                    id="positionDescription"
                                    placeholder="Description (optional)"
                                    value={positionDescription}
                                    onChange={(e) => setPositionDescription(e.target.value)}
                                    className="flex-1 mt-2 sm:mt-0"
                                  />
                                  <Button
                                    onClick={() => {
                                      // add to local form list and call API
                                      if (!editingSport) return;
                                      const temp = {
                                        positionId: '-1',
                                        positionCode: positionCode.trim(),
                                        positionName: positionName.trim(),
                                        description: positionDescription.trim(),
                                        sportId: editingSport.sportId,
                                        createdAt: new Date().toISOString(),
                                        createdBy: 'admin'
                                      };
                                      setFormPositions(prev => [...prev, temp]);
                                      // save to API
                                      handleSavePositionToApi(temp);
                                      setPositionCode('');
                                      setPositionName('');
                                      setPositionDescription('');
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    disabled={!positionCode.trim() || !positionName.trim()}
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {formPositions.length === 0 ? (
                                  <div className="text-center py-8 bg-muted/20 rounded-lg">
                                    <p className="text-muted-foreground text-sm">No positions for this sport yet.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {formPositions.map((pos) => (
                                      <div key={pos.positionId} className="flex items-start sm:items-center justify-between gap-3 p-3 border rounded-md bg-muted/20">
                                        {editingPosition?.positionId === pos.positionId ? (
                                          <div className="w-full">
                                            <div className="flex flex-col sm:flex-row gap-2 items-start">
                                              <Input
                                                value={positionCode}
                                                onChange={(e) => setPositionCode(e.target.value)}
                                                className="w-28"
                                              />
                                              <Input
                                                value={positionName}
                                                onChange={(e) => setPositionName(e.target.value)}
                                                className="flex-1"
                                              />
                                              <Textarea
                                                value={positionDescription}
                                                onChange={(e) => setPositionDescription(e.target.value)}
                                                className="flex-1"
                                              />
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                              <Button
                                                onClick={async () => {
                                                  const updated = {
                                                    ...pos,
                                                    positionCode: positionCode.trim(),
                                                    positionName: positionName.trim(),
                                                    description: positionDescription.trim(),
                                                    sportId: editingSport?.sportId
                                                  };
                                                  await handleSavePositionToApi(updated);
                                                  setEditingPosition(null);
                                                  setPositionCode('');
                                                  setPositionName('');
                                                  setPositionDescription('');
                                                }}
                                                size="sm"
                                              >
                                                Save
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setEditingPosition(null);
                                                  setPositionCode('');
                                                  setPositionName('');
                                                  setPositionDescription('');
                                                }}
                                              >
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="flex-1">
                                              <div className="font-medium text-sm sm:text-base"><span className="font-mono bg-muted px-2 py-1 rounded text-sm mr-2">{pos.positionCode}</span>{pos.positionName}</div>
                                              {pos.description && <div className="text-xs text-muted-foreground mt-1">{pos.description}</div>}
                                            </div>
                                            <div className="flex gap-1 w-full sm:w-auto">
                                              <Button variant="ghost" size="sm" onClick={() => handleEditPositionInForm(pos)}>
                                                <Edit className="w-4 h-4" />
                                              </Button>
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                                    <Trash2 className="w-4 h-4" />
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Position</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Are you sure you want to delete "{pos.positionName}"? This cannot be undone.
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={async () => { if (pos.positionId !== '-1') await handleDeletePositionFromApi(pos.positionId); setFormPositions(prev => prev.filter(p => p.positionId !== pos.positionId)); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </TabsContent>
                      </Tabs>
                    )}

                    {/* Dialog Actions */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t pt-6">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsSportDialogOpen(false);
                          setSportName('');
                          setEditingSport(null);
                          setOriginalSportName('');
                          setFormParameters([]);
                          setEditingParameterInForm(null);
                          setNewParameterName('');
                        }}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>

                      {editingSport ? (
                        // Only show Update when the sport name was changed
                        sportName.trim() !== originalSportName.trim() && (
                          <Button
                            onClick={async () => {
                              try {
                                await updateSport({
                                  ...editingSport,
                                  sportName: sportName.trim()
                                });

                                // close dialog and reset fields
                                setIsSportDialogOpen(false);
                                setSportName('');
                                setEditingSport(null);
                                setOriginalSportName('');
                                setFormParameters([]);
                                setEditingParameterInForm(null);
                                setNewParameterName('');
                              } catch (err) {
                                console.error('Error updating sport:', err);
                              }
                            }}
                            disabled={!sportName.trim()}
                            className="w-full sm:w-auto"
                          >
                            Update Sport
                          </Button>
                        )
                      ) : (
                        <Button 
                          onClick={async () => {
                            await handleSaveSport();
                          }} 
                          disabled={!sportName.trim()}
                          className="w-full sm:w-auto"
                        >
                          Create Sport
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Sports List */}
            <div className="border rounded-lg overflow-hidden">
              <div className="p-4 sm:p-6">
                {filteredSports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm sm:text-base">
                    {sportsSearch ? 'No sports found matching your search.' : 'No sports defined yet. Click "Add Sport" to create your first sport.'}
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {filteredSports.map((sport) => {
                      const activitiesCount = getParametersForSport(sport.sportId).length;
                      return (
                        <div 
                          key={sport.sportId} 
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-md bg-muted/20 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1 w-full">
                            <div className="font-semibold text-sm sm:text-base">{sport.sportName}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                              {activitiesCount} {activitiesCount === 1 ? 'parameter' : 'parameters'}
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSport(sport)}
                              className="flex-1 sm:flex-none"
                            >
                              <Edit className="w-4 h-4 mr-1 sm:mr-2" />
                              <span className="sm:inline">Edit/Add Parameters</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive flex-1 sm:flex-none"
                                >
                                  <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />
                                  <span className="sm:inline">Delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="w-[90%] rounded-lg">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Sport</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the "{sport.sportName}" sport? This action cannot be undone and may affect existing parameters using this sport.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteSport(sport.sportId!)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SportsManagement;