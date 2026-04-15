import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useAppContext } from '@/context/PlayerContext';
import { Sport, SportActivity } from '@/types';

const SportsManagement = () => {
//   const navigate = useNavigate();
  const { sports, sportActivities, addSport, updateSport, deleteSport, addSportActivity, updateSportActivity, deleteSportActivity } = useAppContext();

  // Search and filter states
  const [sportsSearch, setSportsSearch] = useState('');
  const [activitiesSearch, setActivitiesSearch] = useState('');
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>('all');

  // Sports Management
  const [isSportDialogOpen, setIsSportDialogOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [sportName, setSportName] = useState('');

  // Activities Management
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<SportActivity | null>(null);
  const [activityName, setActivityName] = useState('');
  const [selectedSportId, setSelectedSportId] = useState('');

  // Filtered data
  const filteredSports = sports.filter(sport =>
    sport.sportName.toLowerCase().includes(sportsSearch.toLowerCase())
  );

  const filteredActivities = sportActivities.filter(activity => {
    const matchesSearch = activity.activityName.toLowerCase().includes(activitiesSearch.toLowerCase());
    const matchesSport = selectedSportFilter === 'all' || activity.sportId.toString() === selectedSportFilter;
    return matchesSearch && matchesSport;
  });

  // Sports Management Functions
  const handleAddSport = () => {
    setEditingSport(null);
    setSportName('');
    setIsSportDialogOpen(true);
  };

  const handleEditSport = (sport: Sport) => {
    setEditingSport(sport);
    setSportName(sport.sportName);
    setIsSportDialogOpen(true);
  };

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
      setIsSportDialogOpen(false);
      setSportName('');
      setEditingSport(null);
    } catch (err) {
      console.error('Error saving sport:', err);
    }
  };

  const handleDeleteSport = async (sportId: number) => {
    try {
      await deleteSport(sportId);
    } catch (err) {
      console.error('Error deleting sport:', err);
    }
  };

  // Activities Management Functions
  const handleAddActivity = () => {
    setEditingActivity(null);
    setActivityName('');
    setSelectedSportId('');
    setIsActivityDialogOpen(true);
  };

  const handleEditActivity = (activity: SportActivity) => {
    setEditingActivity(activity);
    setActivityName(activity.activityName);
    setSelectedSportId(activity.sportId.toString());
    setIsActivityDialogOpen(true);
  };

  const handleSaveActivity = async () => {
    if (!activityName.trim() || !selectedSportId) return;

    try {
      if (editingActivity) {
        // Update existing activity
        await updateSportActivity({
          ...editingActivity,
          sportId: Number(selectedSportId),
          activityName: activityName.trim()
        });
      } else {
        // Create new activity
        await addSportActivity({
          sportId: Number(selectedSportId),
          activityName: activityName.trim(),
          createdAt: new Date().toISOString()
        });
      }
      setIsActivityDialogOpen(false);
      setActivityName('');
      setSelectedSportId('');
      setEditingActivity(null);
    } catch (err) {
      console.error('Error saving activity:', err);
    }
  };

  const handleDeleteActivity = async (activityId: number) => {
    try {
      await deleteSportActivity(activityId);
    } catch (err) {
      console.error('Error deleting activity:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <Card className="shadow-lg border rounded-2xl">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-2xl font-semibold">⚽ Sports Management</CardTitle>
          <p className="text-muted-foreground">Manage sports and their activities for the scouting system.</p>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <Tabs defaultValue="sports" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sports">Sports</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
            </TabsList>

            {/* ================= SPORTS TAB ================= */}
            <TabsContent value="sports" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search sports..."
                      value={sportsSearch}
                      onChange={(e) => setSportsSearch(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
                <Dialog open={isSportDialogOpen} onOpenChange={setIsSportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddSport} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Sport
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingSport ? 'Edit Sport' : 'Add Sport'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="sportName">Sport Name *</Label>
                        <Input
                          id="sportName"
                          value={sportName}
                          onChange={(e) => setSportName(e.target.value)}
                          placeholder="e.g., Football, Basketball, Tennis"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsSportDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveSport} disabled={!sportName.trim()}>
                          {editingSport ? 'Update' : 'Create'} Sport
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border rounded-lg">
                <div className="p-4">
                  {filteredSports.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      {sportsSearch ? 'No sports found matching your search.' : 'No sports defined yet. Click "Add Sport" to create your first sport.'}
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {filteredSports.map((sport) => (
                        <div key={sport.sportId} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                          <div className="flex-1">
                            <div className="font-medium">
                              {sport.sportName}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSport(sport)}
                            >
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
                                  <AlertDialogTitle>Delete Sport</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the "{sport.sportName}" sport? This action cannot be undone and may affect existing activities using this sport.
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
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ================= ACTIVITIES TAB ================= */}
            <TabsContent value="activities" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search activities..."
                      value={activitiesSearch}
                      onChange={(e) => setActivitiesSearch(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={selectedSportFilter} onValueChange={setSelectedSportFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by sport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sports</SelectItem>
                      {sports.map((sport) => (
                        <SelectItem key={sport.sportId} value={sport.sportId?.toString() ?? ''}>
                          {sport.sportName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleAddActivity} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Activity
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingActivity ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="sportSelect">Sport *</Label>
                        <Select value={selectedSportId} onValueChange={setSelectedSportId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a sport" />
                          </SelectTrigger>
                          <SelectContent>
                            {sports.map((sport) => (
                              <SelectItem key={sport.sportId} value={sport.sportId?.toString() ?? ''}>
                                {sport.sportName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="activityName">Activity Name *</Label>
                        <Input
                          id="activityName"
                          value={activityName}
                          onChange={(e) => setActivityName(e.target.value)}
                          placeholder="e.g., Training, Match, Practice"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsActivityDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveActivity} disabled={!activityName.trim() || !selectedSportId}>
                          {editingActivity ? 'Update' : 'Create'} Activity
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border rounded-lg">
                <div className="p-4">
                  {filteredActivities.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      {activitiesSearch || selectedSportFilter !== 'all' ? 'No activities found matching your filters.' : 'No activities defined yet. Click "Add Activity" to create your first activity.'}
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {filteredActivities.map((activity) => (
                        <div key={activity.activityId} className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                          <div className="flex-1">
                            <div className="font-medium">
                              {activity.activityName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Sport: {activity.sport?.sportName || 'Unknown'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditActivity(activity)}
                            >
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
                                  <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the "{activity.activityName}" activity? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteActivity(activity.activityId!)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SportsManagement;