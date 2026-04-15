import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Player, Review, Scout, PlayerDocument, Club, ClubContact, Note, Task, Email, Template, ContactRole, PlayerPosition, Sport, SportActivity } from '@/types';
import {
  createClub, updateClubApi, deleteClubApi, uploadClubLogoApi, fetchTemplates,
  createClubContactApi, updateClubContactApi, deleteClubContactApi,
  createContactRoleApi, updateContactRoleApi, deleteContactRoleApi,
  fetchPlayerPositions, createPlayerPositionApi, updatePlayerPositionApi, deletePlayerPositionApi,
  fetchSportsApi, createSportApi, updateSportApi, deleteSportApi,
  fetchSportActivitiesApi, createSportActivityApi, updateSportActivityApi, deleteSportActivityApi,
  createTemplateApi,
  updateTemplateApi,
  deleteTemplateApi, createPlayerApi,
  createTaskApi,
  updatePlayerApi,
  deletePlayerApi, createReviewApi, createReviewRatingApi, createReviewActivityRatingsApi, createReviewSkillDetailApi,
  createNoteApi, updateNoteApi, deleteNoteApi,
  updateTaskApi, deleteTaskApi,
  updateEmailApi,
  deleteEmailApi,
  sendPowerAutomateEmail,
  createDocumentApi,
  deleteDocumentApi,
  updateDocumentApi,
  getDocumentsApi,
  uploadPlayerImageApi,
  createScoutApi,
  updateScoutApi,
  deleteScoutApi,
  fetchScouts
} from '@/services/apiService';
import {
  initialPlayers, initialReviews, scouts as mockScouts,
  initialClubs, initialClubContacts, initialContactRoles, initialPlayerPositions, initialNotes, initialTasks, initialEmails, initialTemplates,
} from '@/data/mockData';
import { addMonths, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import { getAverageRatings, calculateOverallAverage, buildRatingsFromActivityRows } from '@/lib/playerUtils';
import { getContractExpiringMonths } from '@/lib/settingsUtils';

interface AppContextType {
  players: Player[];
  reviews: Review[];
  scouts: Scout[];
  documents: PlayerDocument[];
  clubs: Club[];
  clubContacts: ClubContact[];
  contactRoles: ContactRole[];
  playerPositions: PlayerPosition[];
  sports: Sport[];
  sportActivities: SportActivity[];
  notes: Note[];
  tasks: Task[];
  emails: Email[];
  templates: Template[];
  addPlayer: (p: Player, imageFile?: File) => Promise<void>;
  // updatePlayer: (p: Player) => Promise<void>;
  updatePlayer: (p: Player) => Promise<Player>;
  deletePlayer: (id: string) => Promise<void>;
  addReview: (r: Review) => Promise<void>;
  addDocument: (file: File, clubId?: string, playerId?: string, type?: string, isVisibleToPlayer?: boolean) => void;
  updateDocument: (id: string, payload: any) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addClub: (c: Club, logoFile?: File | null) => Promise<void>;
  updateClub: (c: Club, logoFile?: File | null) => Promise<void>;
  deleteClub: (id: string) => Promise<void>;
  addClubContact: (c: ClubContact) => void;
  updateClubContact: (c: ClubContact) => void;
  deleteClubContact: (id: string) => void;
  addNote: (n: Note) => Promise<void>;
  updateNote: (n: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  addTask: (t: Task) => void;
  updateTask: (t: Task) => void;
  deleteTask: (id: string) => Promise<void>;
  addTemplate: (t: Template) => void;
  updateTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;
  generateAutoTasks: () => void;
  addEmail: (e: Email) => Promise<void>;
  updateEmail: (e: Email) => Promise<void>;
  deleteEmail: (id: string) => Promise<void>;
  addScout: (s: Scout) => Promise<void>;
  updateScout: (s: Scout) => Promise<void>;
  deleteScout: (id: string) => Promise<void>;
  addContactRole: (r: ContactRole) => Promise<void>;
  updateContactRole: (r: ContactRole) => Promise<void>;
  deleteContactRole: (id: string) => Promise<void>;
  addPlayerPosition: (p: PlayerPosition) => Promise<void>;
  updatePlayerPosition: (p: PlayerPosition) => Promise<void>;
  deletePlayerPosition: (id: string) => Promise<void>;
  addSport: (s: Sport) => Promise<void>;
  updateSport: (s: Sport) => Promise<void>;
  deleteSport: (id: number) => Promise<void>;
  addSportActivity: (sa: SportActivity) => Promise<void>;
  updateSportActivity: (sa: SportActivity) => Promise<void>;
  deleteSportActivity: (id: number) => Promise<void>;
  loadDocuments: () => Promise<void>;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const AppContext = createContext<AppContextType | null>(null);

export const usePlayerContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('usePlayerContext must be used within PlayerProvider');
  return ctx;
};

export const useAppContext = usePlayerContext;

export const PlayerProvider = ({ children }: { children: ReactNode }) => {

  // ── State — seeded directly from API data (loaded before this mounts) ────
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [scouts, setScouts] = useState<Scout[]>(mockScouts);
  const [documents, setDocuments] = useState<PlayerDocument[]>([]);
  const [clubs, setClubs] = useState<Club[]>(initialClubs);
  const [clubContacts, setClubContacts] = useState<ClubContact[]>(initialClubContacts);
  const [contactRoles, setContactRoles] = useState<ContactRole[]>(initialContactRoles);
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>(initialPlayerPositions);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportActivities, setSportActivities] = useState<SportActivity[]>([]);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);

  const loadDocuments = async () => {
    try {
      const data = await getDocumentsApi();
      setDocuments(data);
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  };

  const { toast } = useToast();

  const showSuccess = (title: string, description?: string) => {
    toast({
      title,
      description,
      className: "bg-green-600 text-white border-green-700",
    });
  };

  const showError = (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: "destructive", // keeps red default
    });
  };

  const showUpdate = (title: string, description?: string) => {
    toast({
      title,
      description,
      className: "bg-blue-600 text-white border-blue-700",
    });
  };

  const sendHtmlEmail = async (recipient: string, subject: string, htmlBody: string) => {
    if (!recipient) return;
    try {
      await sendPowerAutomateEmail(recipient, subject, htmlBody);
      showSuccess('Email Sent', 'Task notification email sent successfully.');
    } catch (err) {
      console.error('Power Automate task email failed', err);
    }
  };

  const generateAutoTasks = useCallback(() => {
    const now = new Date();

    setTasks(prevTasks => {
      const newTasks: Task[] = [];

      // ── 1. Contract expiry (configurable via settings)
      const expiringMonths = getContractExpiringMonths();
      const expiringCutoff = addMonths(now, expiringMonths);

      players.forEach(p => {
        const end = new Date(p.contractEnd);
        const daysLeft = differenceInDays(end, now);
        if (end > now && end <= expiringCutoff) {
          const exists = prevTasks.some(
            t => t.source === 'contract' && String(t.playerId) === String(p.id) && t.status === 'open'
          );
          if (!exists) {
            newTasks.push({
              taskId: crypto.randomUUID(),
              title: `Contract expiring soon - ${p.fullName}`,
              description: `Contract ends ${p.contractEnd}. Begin renewal discussions.`,
              playerId: p.id,
              clubId: undefined,
              assignedToScoutId: p.agent_scout_id,   // ← no hardcoded fallback
              dueDate: p.contractEnd,
              status: 'open',
              createdAt: now.toISOString(),
              source: 'contract',
            });
          }
        }
      });

      // ── 2. Note follow-up (all categories) ───────────────────────────────
      notes.forEach(n => {
        if (!n.followUpDate) return;

        // source reflects the note category
        const source =
          n.category === 'medical' ? 'medical' :
            n.category === 'private' ? 'personal' :
              'note';

        const exists = prevTasks.some(
          t => t.source === source && t.description.includes(n.noteId) && t.status === 'open'
        );
        if (!exists) {
          const player = players.find(p => String(p.id) === String(n.playerId));
          const club = clubs.find(c => c.clubId === n.clubId);
          const entityName = player?.fullName || club?.clubName || 'Unknown';

          newTasks.push({
            taskId: crypto.randomUUID(),
            title: `Follow up: ${n.topic}`,
            description: `Follow up on note ${n.noteId} for ${entityName}.`,
            playerId: n.playerId,
            clubId: n.clubId,
            assignedToScoutId: n.createdByScoutId,
            dueDate: n.followUpDate,
            status: 'open',
            createdAt: now.toISOString(),
            source,   // 'medical' | 'personal' | 'note'
          });
        }
      });

      // ── 3. Review skill follow-up ─────────────────────────────────────────
      reviews.forEach(r => {
        if (!r.revSkillDetails) return;
        Object.entries(r.revSkillDetails).forEach(([skill, detail]) => {
          if (!detail.followUpDate) return;
          const exists = prevTasks.some(
            t =>
              t.source === 'review' &&
              t.description.includes(r.reviewId) &&
              t.description.includes(skill) &&
              t.status === 'open'
          );
          if (!exists) {
            const player = players.find(p => String(p.id) === String(r.playerId));
            newTasks.push({
              taskId: crypto.randomUUID(),
              title: `Review follow-up: ${skill} - ${player?.fullName || 'Unknown'}`,
              description: `Follow up on ${skill} from review ${r.reviewId}.`,
              playerId: r.playerId,
              clubId: undefined,
              assignedToScoutId: r.scoutId,
              dueDate: detail.followUpDate,
              status: 'open',
              createdAt: now.toISOString(),
              source: 'review',
            });
          }
        });
      });

      // ── 4. Performance issue (avg rating < 3) ────────────────────────────
      players.forEach(p => {
        const playerReviews = reviews.filter(r => String(r.playerId) === String(p.id));
        if (playerReviews.length === 0) return;

        const avg = calculateOverallAverage(getAverageRatings(playerReviews));
        if (avg < 3) {
          const exists = prevTasks.some(
            t => t.source === 'performance' && String(t.playerId) === String(p.id) && t.status === 'open'
          );
          if (!exists) {
            newTasks.push({
              taskId: crypto.randomUUID(),
              title: `Performance concern - ${p.fullName}`,
              description: `Overall rating is ${avg.toFixed(1)}/5. Review and update development plan.`,
              playerId: p.id,
              clubId: undefined,
              assignedToScoutId: p.agent_scout_id,
              dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'open',
              createdAt: now.toISOString(),
              source: 'performance',
            });
          }
        }
      });

      return newTasks.length > 0 ? [...prevTasks, ...newTasks] : prevTasks;
    });
  }, [players, notes, reviews, clubs]);  // ← tasks removed from deps

  const autoTasksRan = useRef(false);

  useEffect(() => {
    if (autoTasksRan.current) return;
    autoTasksRan.current = true;
    generateAutoTasks();
  }, []);

  useEffect(() => {
    const loadScouts = async () => {
      try {
        const data = await fetchScouts();
        setScouts(data);
      } catch (err) {
        console.error("Failed to load scouts", err);
        // Keep mock data as fallback
      }
    };
    loadScouts();
  }, []);

  useEffect(() => {
    const loadSports = async () => {
      try {
        const sportsData = await fetchSportsApi();
        setSports(sportsData);
      } catch (err) {
        console.error("Failed to load sports", err);
      }
    };
    const loadSportActivities = async () => {
      try {
        const activitiesData = await fetchSportActivitiesApi();
        setSportActivities(activitiesData);
      } catch (err) {
        console.error("Failed to load sport activities", err);
      }
    };
    loadSports();
    loadSportActivities();
  }, []);

  useEffect(() => {
    if (sportActivities.length === 0 || reviews.length === 0) return;

    setReviews(prevReviews => {
      let changed = false;
      const updatedReviews = prevReviews.map(review => {
        if (review.revRatings || !review.revRatingActivities?.length) return review;

        const revRatings = buildRatingsFromActivityRows(review, sportActivities);

        if (Object.values(revRatings).some(value => value > 0)) {
          changed = true;
          return { ...review, revRatings };
        }

        return review;
      });

      return changed ? updatedReviews : prevReviews;
    });
  }, [sportActivities, reviews]);

  // ── Context value ─────────────────────────────────────────────────────────
  return (
    <AppContext.Provider value={{
      players, reviews, scouts, documents, clubs, clubContacts, contactRoles, playerPositions, sports, sportActivities,
      notes, tasks, emails, templates, loadDocuments,


      // ===========================================================
      // ===========================================================


      // addPlayer: async (p, imageFile) => {
      //   try {
      //     // Step 1: Create player without image
      //     const created = await createPlayerApi({
      //       fullName: p.fullName,
      //       dateOfBirth: p.dateOfBirth,
      //       nationality: p.nationality,
      //       position: p.position,
      //       preferredFoot: p.preferredFoot,
      //       heightCm: p.heightCm,
      //       weightKg: p.weightKg,
      //       currentClub: p.currentClub,
      //       contractStart: p.contractStart,
      //       contractEnd: p.contractEnd,
      //       agentName: p.agentName,
      //       agent_scout_id: p.agent_scout_id,
      //       contact_info: p.contact_info,
      //       // Don't send image in initial creation
      //       profileImage: undefined
      //     });

      //     // Step 2: If image file is provided, upload it
      //     if (imageFile) {
      //       try {
      //         const uploadResult = await uploadPlayerImageApi(created.id, imageFile);

      //         // Step 3: Update player with image URL
      //         const updatedPlayer = await updatePlayerApi(created.id, {
      //           profileImage: uploadResult.imageUrl
      //         });

      //         setPlayers(prev => [...prev, updatedPlayer]);
      //         showSuccess("Player Created", `${updatedPlayer.fullName} added successfully with image`);
      //       } catch (uploadErr) {
      //         console.error("Image upload failed", uploadErr);
      //         // Still add player even if image upload fails
      //         setPlayers(prev => [...prev, created]);
      //         showSuccess("Player Created", `${created.fullName} added successfully (image upload failed)`);
      //       }
      //     } else {
      //       setPlayers(prev => [...prev, created]);
      //       showSuccess("Player Created", `${created.fullName} added successfully`);
      //     }

      //   } catch (err) {
      //     console.error("Create player API failed", err);
      //     showError("Error", "Failed to create player");
      //     // fallback (optional)
      //     // setPlayers(prev => [...prev, p]);
      //   }
      // },

      addPlayer: async (p, imageFile) => {
        try {
          const created = await createPlayerApi({
            fullName: p.fullName,
            dateOfBirth: p.dateOfBirth,
            nationality: p.nationality,
            position: p.position,
            preferredFoot: p.preferredFoot,
            heightCm: p.heightCm,
            weightKg: p.weightKg,
            currentClub: p.currentClub,
            contractStart: p.contractStart,
            contractEnd: p.contractEnd,
            agentName: p.agentName,
            agent_scout_id: p.agent_scout_id,
            contact_info: p.contact_info,
            profileImage: undefined,
            player_email: p.player_email,
            sportId: p.sportId,
            contractStartWithCoach: p.contractStartWithCoach,
            contractEndWithCoach: p.contractEndWithCoach
          });

          console.log("Created:", created);

          let finalPlayer = created;

          if (imageFile) {
            try {
              const uploadResult = await uploadPlayerImageApi(created.id, imageFile);

              // finalPlayer = await updatePlayerApi(created.id, {
              //   profileImage: uploadResult.imageUrl
              // });
              finalPlayer = await updatePlayerApi(created.id, {
                ...created, // ✅ keep all existing data
                profileImage: uploadResult.imageUrl
              });
            } catch (err) {
              console.error("Image upload failed", err);
            }
          }

          setPlayers(prev => [...prev, finalPlayer]);

          // try {
          //   const recipient = finalPlayer.player_email || '';
          //   if (recipient) {
          //     const emailSubject = `New player created: ${finalPlayer.fullName}`;
          //     const emailBody = `A new player has been created with the following details:\n\nName: ${finalPlayer.fullName}\nEmail: ${finalPlayer.player_email || 'N/A'}\nClub: ${finalPlayer.currentClub}\nPosition: ${finalPlayer.position}\n\nPlease review the new player in the application.`;
          //     await sendPowerAutomateEmail(recipient, emailSubject, emailBody);
          //   } else {
          //     console.warn('Skipping email send because player has no email address');
          //   }
          // } catch (err) {
          //   console.error("Power Automate email failed", err);
          // }

          showSuccess("Player Created", `${finalPlayer.fullName} added successfully`);

        } catch (err) {
          console.error("Create player API failed", err);
          showError("Error", "Failed to create player");
        }
      },

      updatePlayer: async (p) => {
        try {
          const updated = await updatePlayerApi(p.id, {
            fullName: p.fullName,
            dateOfBirth: p.dateOfBirth,
            nationality: p.nationality,
            position: p.position,
            preferredFoot: p.preferredFoot,
            heightCm: p.heightCm,
            weightKg: p.weightKg,
            currentClub: p.currentClub,
            contractStart: p.contractStart,
            contractEnd: p.contractEnd,
            agentName: p.agentName,
            agent_scout_id: p.agent_scout_id,
            contact_info: p.contact_info,
            profileImage: p.profileImage,
            sportId: p.sportId,
            contractStartWithCoach: p.contractStartWithCoach,
            contractEndWithCoach: p.contractEndWithCoach,
          });

          setPlayers(prev =>
            prev.map(x => x.id === updated.id ? updated : x)
          );

          showUpdate("Player Updated", `${updated.fullName} updated`);

          return updated;

        } catch (err) {
          console.error("Update player API failed", err);
          showError("Error", "Failed to update player");
        }
      },

      deletePlayer: async (id: string) => {
        try {
          await deletePlayerApi(id);

          toast({
            title: "🗑️ Player Deleted",
            description: "Player removed successfully",
            className: "bg-orange-500 text-white",
          });

          setPlayers(prev => prev.filter(p => p.id !== id));
        } catch (err) {
          console.error("Delete player API failed", err);
          toast({
            title: "❌ Delete Failed",
            description: "Unable to delete player",
            variant: "destructive",
          });
        }
      },


      // ===========================================================
      // ===========================================================

      addReview: async (r) => {
        try {
          const createdReview = await createReviewApi({
            playerId: String(r.playerId),
            scoutId: r.scoutId,
            matchDate: r.matchDate || undefined,
            club1Id: r.club1Id,
            club2Id: r.club2Id,
            notes: r.notes,
          });

          if (Array.isArray((r as any).revRatingActivities) && (r as any).revRatingActivities.length > 0) {
            try {
              await createReviewActivityRatingsApi({
                reviewId: createdReview.reviewId,
                ratings: (r as any).revRatingActivities,
              });
            } catch (ratingErr) {
              console.error('Failed to save review activity ratings', ratingErr);
            }
          } else if (r.revRatings && typeof r.revRatings === 'object' && !Array.isArray(r.revRatings)) {
            const staticRatingKeys = ['passing', 'shooting', 'dribbling', 'tacticalAwareness', 'defensiveContribution', 'physicalStrength', 'behavior', 'overallPerformance'];
            const hasStaticRatings = staticRatingKeys.every(key => key in r.revRatings);
            if (hasStaticRatings) {
              await createReviewRatingApi({
                reviewId: createdReview.reviewId,
                passing: r.revRatings.passing,
                shooting: r.revRatings.shooting,
                dribbling: r.revRatings.dribbling,
                tacticalAwareness: r.revRatings.tacticalAwareness,
                defensiveContribution: r.revRatings.defensiveContribution,
                physicalStrength: r.revRatings.physicalStrength,
                behavior: r.revRatings.behavior,
                overallPerformance: r.revRatings.overallPerformance,
              });
            }
          }

          if (r.revSkillDetails && typeof r.revSkillDetails === 'object') {
            await Promise.all(Object.entries(r.revSkillDetails).map(async ([skillKey, detail]) => {
              try {
                await createReviewSkillDetailApi({
                  reviewId: createdReview.reviewId,
                  skillKey,
                  rating: detail.rating,
                  commentText: detail.comment,
                  followUpDate: detail.followUpDate,
                });
              } catch (detailErr) {
                console.error(`Failed to save review skill detail ${skillKey}`, detailErr);
              }
            }));
          }

          setReviews(prev => [...prev, {
            ...r,
            reviewId: createdReview.reviewId,
            revRatings: r.revRatings,
            revSkillDetails: r.revSkillDetails,
            revRatingActivities: (r as any).revRatingActivities,
          }]);

          showSuccess('Review Created', `Review ${createdReview.reviewId} was created successfully.`);

          // ── Auto-create one task per skill that has a followUpDate ────────
          if (r.revSkillDetails) {
            const player = players.find(p => String(p.id) === String(r.playerId));
            const createdTasks: Task[] = [];

            for (const [skill, detail] of Object.entries(r.revSkillDetails)) {
              if (!detail.followUpDate) continue; // skip skills with no date selected

              const taskPayload: any = {
                title: `Review follow-up: ${skill} - ${player?.fullName || 'Unknown'}`,
                description: `Follow up on ${skill} rating from review on ${r.matchDate}. Review ID: ${createdReview.reviewId}.`,
                playerId: String(r.playerId),
                // clubId: r.club1Id || undefined,   // ← club1Id from the review form
                assignedToScoutId: r.scoutId,     // ← scout who created the review
                dueDate: detail.followUpDate,     // ← date picked in that skill's date picker
                status: 'open',
                source: 'review',
              };

              try {
                const createdTask = await createTaskApi(taskPayload);
                setTasks(prev => [...prev, createdTask]);
                createdTasks.push(createdTask);
                showSuccess('Task Created', `Auto task for ${skill} created.`);
              } catch (taskErr) {
                console.error('Auto task creation failed', taskErr);
                showError('Task Missed', `Failed to create follow-up task for ${skill}.`);
                const fallbackTask = {
                  taskId: crypto.randomUUID(),
                  ...taskPayload,
                  createdAt: new Date().toISOString(),
                };
                setTasks(prev => [...prev, fallbackTask]);
                createdTasks.push(fallbackTask);
              }
            }

            if (createdTasks.length > 0) {
              const recipient = player?.player_email?.trim() || scouts.find(s => s.scoutId === r.scoutId)?.email?.trim();

              if (recipient) {
                const emailSubject = `Review follow-up tasks created for ${player?.fullName || 'your player'}`;
                const emailRows = createdTasks.map(task => `
                  <tr>
                    <td style="padding:10px; border:1px solid #e3e8ee;">${task.title}</td>
                    <td style="padding:10px; border:1px solid #e3e8ee;">${task.dueDate}</td>
                    <td style="padding:10px; border:1px solid #e3e8ee;">${task.description}</td>
                    <td style="padding:10px; border:1px solid #e3e8ee;">
                      <a href="${window.location.origin}/tasks?taskId=${task.taskId}" style="background:#1f4e79; color:#fff; padding:6px 12px; text-decoration:none; border-radius:4px; font-size:12px; display:inline-block;">View Task</a>
                    </td>
                  </tr>
                `).join('');

                const emailBody = `
                  <div style="font-family:Arial,sans-serif; color:#111; line-height:1.5;">
                    <h2 style="margin:0 0 16px; color:#1f4e79;">Review Follow-Up Tasks Created</h2>
                    <p style="margin:0 0 16px;">The following review follow-up tasks were created based on the latest ratings.</p>
                    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                      <thead>
                        <tr>
                          <th style="text-align:left; padding:10px; background:#f4f6fb; border:1px solid #e3e8ee;">Task</th>
                          <th style="text-align:left; padding:10px; background:#f4f6fb; border:1px solid #e3e8ee;">Due Date</th>
                          <th style="text-align:left; padding:10px; background:#f4f6fb; border:1px solid #e3e8ee;">Details</th>
                          <th style="text-align:left; padding:10px; background:#f4f6fb; border:1px solid #e3e8ee;">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${emailRows}
                      </tbody>
                    </table>
                    <p style="margin:0;">Please review these tasks in the application.</p>
                  </div>
                `;

                await sendHtmlEmail(recipient, emailSubject, emailBody);
              } else {
                console.warn('Skipping review task notification email because no recipient email address was available');
              }
            }
          }

        } catch (err) {
          console.error('addReview API failed', err);
          showError('Error', 'Failed to create review');
          setReviews(prev => [...prev, r]);
        }
      },

      // ===========================================================
      // ===========================================================

      addDocument: async (file: File, clubId?: string, playerId?: string, type?: string, isVisibleToPlayer?: boolean) => {
        try {
          const base64 = await fileToBase64(file);

          const payload = {
            clubId,
            playerId,
            documentName: file.name,
            // documentType: file.type || "other",
            documentType: type || "other",
            documentDate: new Date().toISOString(),
            fileSizeLabel: `${(file.size / 1024).toFixed(1)} KB`,
            fileData: base64.split(',')[1],
            isVisibleToPlayer: isVisibleToPlayer ?? false,
          };

          const created = await createDocumentApi(payload);
          setDocuments(prev => [...prev, created]);
          showSuccess("Document Uploaded", `${created.documentName} uploaded successfully`);
        } catch (err) {
          console.error("Upload failed", err);
          showError("Upload Failed", "Unable to upload document");
        }
      },

      updateDocument: async (id, payload) => {
        try {
          await updateDocumentApi(id, { ...payload, documentType: payload.documentType ? payload.documentType : "other", documentDate: new Date() });

          setDocuments(prev =>
            prev.map(d =>
              d.documentId === id
                ? {
                  ...d,
                  documentName: payload.documentName ?? d.documentName,
                  documentType: payload.documentType ? payload.documentType : d.documentType ? d.documentType : "other",
                  documentDate: payload.documentDate ?? d.documentDate,
                  fileSizeLabel: payload.fileSizeLabel ?? d.fileSizeLabel,
                  fileData: payload.fileData ?? d.fileData,
                  isVisibleToPlayer: payload.isVisibleToPlayer ?? d.isVisibleToPlayer ?? false,
                }
                : d
            )
          );
          showUpdate("Document Updated", "Document updated successfully");
        } catch (err) {
          console.error("Update document failed", err);
          showError("Update Failed", "Unable to update document");
        }
      },

      deleteDocument: async (id) => {
        try {
          await deleteDocumentApi(id);
          setDocuments(prev => prev.filter(d => d.documentId !== id));
          showSuccess("Document Deleted", "Document deleted successfully");
        } catch (err) {
          console.error("Delete document failed", err);
          showError("Delete Failed", "Unable to delete document");
        }
      },

      // ===========================================================
      // ===========================================================

      addClub: async (c, logoFile) => {
        try {
          const newClub = await createClub({
            clubName: c.clubName,
            country: c.country,
            addressLine: c.addressLine,
            logoUrl: c.logoUrl,
          });

          let finalClub = newClub;

          if (logoFile) {
            try {
              const uploadResult = await uploadClubLogoApi(newClub.clubId, logoFile);
              finalClub = await updateClubApi(newClub.clubId, {
                ...newClub,
                logoUrl: uploadResult.logoUrl,
              });
            } catch (uploadErr) {
              console.error('Club logo upload failed', uploadErr);
            }
          }

          setClubs(prev => [...prev, finalClub]);
          showSuccess("Club Created", `${finalClub.clubName} created successfully`);
        } catch (err) {
          console.error('createClub API failed, adding locally', err);
          setClubs(prev => [...prev, c]);
          showError("Error", "Failed to create club");
          throw err;
        }
      },

      updateClub: async (c, logoFile) => {
        try {
          let logoUrl = c.logoUrl;

          if (logoFile) {
            try {
              const uploadResult = await uploadClubLogoApi(c.clubId, logoFile);
              logoUrl = uploadResult.logoUrl;
            } catch (uploadErr) {
              console.error('Club logo upload failed', uploadErr);
            }
          }

          const updated = await updateClubApi(c.clubId, {
            clubName: c.clubName,
            country: c.country,
            addressLine: c.addressLine,
            logoUrl,
          });

          setClubs(prev => prev.map(x => x.clubId === updated.clubId ? updated : x));
          showUpdate("Club Updated", `${updated.clubName} updated successfully`);
        } catch (err) {
          console.error("Update club API failed", err);
          showError("Error", "Failed to update club");
        }
      },

      deleteClub: async (id: string) => {
        try {
          await deleteClubApi(id);
          setClubs(prev => prev.filter(c => c.clubId !== id));
          showSuccess("Club Deleted", "Club deleted successfully");
        } catch (err) {
          console.error("Delete club API failed", err);
          // showError("Error", "Failed to delete club");
          const message = err?.message?.toLowerCase() || "";

          const isFKError =
            message.includes("foreign key") ||
            message.includes("constraint") ||
            message.includes("reference") ||
            message.includes("conflicted");

          if (isFKError) {
            toast({
              title: "⚠️ Cannot Delete Club",
              description:
                "This club is linked to existing records (reviews, players, tasks, or contacts). Please remove those dependencies before deleting the club.",
              className: "bg-yellow-500 text-white",
            });
          } else {
            showError("Delete Failed", "Unable to delete club. Please try again.");
          }
        }
      },

      // ===========================================================
      // ===========================================================

      addClubContact: async (c) => {
        try {
          const created = await createClubContactApi({
            clubId: c.clubId,
            contactName: c.contactName,
            roleName: c.roleName,
            email: c.email,
            phone: c.phone,
          });

          setClubContacts(prev => [...prev, created]);
          showSuccess("Contact Created", `${created.contactName} created successfully`);
        } catch (err) {
          console.error("Create contact failed", err);
          showError("Error", "Failed to create contact");
        }
      },

      updateClubContact: async (c) => {
        try {
          const updated = await updateClubContactApi(c.clubContactId, {
            contactName: c.contactName,
            roleName: c.roleName,
            email: c.email,
            phone: c.phone,
          });

          setClubContacts(prev =>
            prev.map(x => x.clubContactId === updated.clubContactId ? updated : x)
          );
          showUpdate("Contact Updated", `${updated.contactName} updated successfully`);
        } catch (err) {
          console.error("Update contact failed", err);
          showError("Error", "Failed to update contact");
        }
      },

      deleteClubContact: async (id) => {
        try {
          await deleteClubContactApi(id);
          setClubContacts(prev => prev.filter(x => x.clubContactId !== id));
          showSuccess("Contact Deleted", "Contact deleted successfully");
        } catch (err) {
          console.error("Delete contact failed", err);
          showError("Error", "Failed to delete contact");
        }
      },

      // ===========================================================
      // ===========================================================

      // addNote: async (n) => {
      //   try {
      //     const created = await createNoteApi({
      //       playerId: n.playerId ? String(n.playerId) : undefined,
      //       clubId: n.clubId ? String(n.clubId) : undefined,
      //       createdByScoutId: n.createdByScoutId,
      //       category: n.category,
      //       topic: n.topic,
      //       description: n.description,
      //       followUpDate: n.followUpDate || undefined,
      //     });
      //     setNotes(prev => [...prev, created]);
      //   } catch (err) {
      //     console.error('createNote API failed', err);
      //     setNotes(prev => [...prev, n]); // fallback
      //   }
      // },

      addNote: async (n) => {
        try {
          // ── Step 1: Create the note first ─────────────────────────────
          const created = await createNoteApi({
            playerId: n.playerId ? String(n.playerId) : undefined,
            clubId: n.clubId ? String(n.clubId) : undefined,
            createdByScoutId: n.createdByScoutId,
            category: n.category,
            topic: n.topic,
            description: n.description,
            followUpDate: n.followUpDate || undefined,
            isVisibleToPlayer: n.isVisibleToPlayer ?? false,
          });

          // ── Step 2: Only if note was saved successfully, add to state ──
          setNotes(prev => [...prev, created]);
          showSuccess("Note Created", `Note ${created.noteId} created successfully`);

          // ── Step 3: Only if note success AND followUpDate is future ────
          if (created.noteId && created.followUpDate) {
            const followUp = new Date(created.followUpDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (followUp >= today) {
              const source =
                created.category === 'medical' ? 'medical' :
                  created.category === 'private' ? 'personal' : 'note';

              const player = players.find(p => String(p.id) === String(created.playerId));
              const club = clubs.find(c => c.clubId === created.clubId);
              const entityName = player?.fullName || club?.clubName || 'Unknown';

              const taskPayload: any = {
                title: `Follow up: ${created.topic}`,
                playerId: n.playerId ? String(n.playerId) : undefined,
                description: `Follow up on ${source} note for ${entityName}. Note ID: ${created.noteId}.`,
                assignedToScoutId: created.createdByScoutId,
                dueDate: created.followUpDate,
                status: 'open',
                source: 'note',
              };

              // Never send both playerId and clubId — DB constraint requires exactly one
              if (created.playerId) {
                taskPayload.playerId = String(created.playerId);
              } else if (created.clubId) {
                taskPayload.clubId = String(created.clubId);
              }

              let taskToNotify: Task | null = null;

              try {
                taskToNotify = await createTaskApi(taskPayload);
                setTasks(prev => [...prev, taskToNotify]);
              } catch (taskErr) {
                console.error('Auto task from note failed', taskErr);
                taskToNotify = {
                  taskId: crypto.randomUUID(),
                  ...taskPayload,
                  createdAt: new Date().toISOString(),
                };
                setTasks(prev => [...prev, taskToNotify]);
              }

              if (taskToNotify) {
                const recipient = player?.player_email?.trim() || scouts.find(s => s.scoutId === created.createdByScoutId)?.email?.trim();
                if (recipient) {
                  const emailSubject = `Follow-up task created for note: ${created.topic}`;
                  const emailBody = `
                    <div style="font-family:Arial,sans-serif; color:#111; line-height:1.5;">
                      <h2 style="margin:0 0 16px; color:#1f4e79;">Follow-Up Task Created</h2>
                      <p style="margin:0 0 16px;">A follow-up task was created based on your note.</p>
                      <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                        <tr>
                          <td style="padding:10px; font-weight:700; background:#f4f6fb; border:1px solid #e3e8ee; width:140px;">Note Topic</td>
                          <td style="padding:10px; border:1px solid #e3e8ee;">${created.topic}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px; font-weight:700; background:#f4f6fb; border:1px solid #e3e8ee;">Task Title</td>
                          <td style="padding:10px; border:1px solid #e3e8ee;">${taskToNotify.title}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px; font-weight:700; background:#f4f6fb; border:1px solid #e3e8ee;">Due Date</td>
                          <td style="padding:10px; border:1px solid #e3e8ee;">${taskToNotify.dueDate}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px; font-weight:700; background:#f4f6fb; border:1px solid #e3e8ee;">Related To</td>
                          <td style="padding:10px; border:1px solid #e3e8ee;">${entityName}</td>
                        </tr>
                      </table>
                      <p style="margin:0 0 16px;">${taskToNotify.description}</p>
                      <p style="margin:0;">
                        <a href="${window.location.origin}/tasks?taskId=${taskToNotify.taskId}" style="background:#1f4e79; color:#fff; padding:10px 20px; text-decoration:none; border-radius:4px; display:inline-block;">View Task Details</a>
                      </p>
                    </div>
                  `;
                  await sendHtmlEmail(recipient, emailSubject, emailBody);
                } else {
                  console.warn('Skipping note task notification email because no recipient email address was available');
                }
              }
            }
          }

        } catch (err) {
          // ── Note creation failed — do NOT create any task ──────────────
          console.error('createNote API failed', err);
          showError('Error', 'Failed to create note');
          setNotes(prev => [...prev, n]);
        }
      },

      updateNote: async (n: Note) => {
        // optimistic UI update so toggle updates immediately when user clicks
        setNotes(prev =>
          prev.map(x => x.noteId === n.noteId ? { ...x, ...n } : x)
        );

        try {
          const updated = await updateNoteApi(n.noteId, {
            playerId: n.playerId,
            clubId: n.clubId,
            category: n.category,
            topic: n.topic,
            description: n.description,
            followUpDate: n.followUpDate,
            isVisibleToPlayer: n.isVisibleToPlayer,
          });

          setNotes(prev =>
            prev.map(x => x.noteId === updated.noteId ? updated : x)
          );
          showUpdate("Note Updated", `${updated.topic} updated successfully`);
        } catch (err) {
          console.error("Update note failed", err);
          showError("Error", "Failed to update note");
          // roll back on failure
          setNotes(prev =>
            prev.map(x => x.noteId === n.noteId ? { ...x, ...n } : x)
          );
        }
      },

      deleteNote: async (id: string) => {
        // ── Optimistic update: remove immediately from UI ──────────────
        setNotes(prev => prev.filter(n => n.noteId !== id));

        try {
          await deleteNoteApi(id);
          showSuccess("Note Deleted", "Note deleted successfully");
        } catch (err) {
          console.error("Delete note failed", err);
          showError("Error", "Failed to delete note");
          // ── Revert: restore the note if API fails ──────────────────────
          setNotes(prev => prev);
        }
      },


      // ===========================================================
      // ===========================================================

      addTask: async (t: Task) => {
        try {
          const payload: any = {
            title: t.title,
            description: t.description,
            assignedToScoutId: t.assignedToScoutId,
            dueDate: t.dueDate,
            source: t.source || 'manual',
            status: t.status
          };
          if (t.playerId) payload.playerId = t.playerId.toString();
          if (t.clubId) payload.clubId = t.clubId.toString();
          const created = await createTaskApi(payload);

          setTasks(prev => [...prev, created]);

          try {
            const player = created.playerId
              ? players.find(p => String(p.id) === String(created.playerId))
              : undefined;
            const scoutAssignee = scouts.find(s => s.scoutId === created.assignedToScoutId);
            const recipient = player?.player_email?.trim() || scoutAssignee?.email?.trim();

            if (recipient) {
              const entityName = created.playerId
                ? player?.fullName
                : created.clubId
                  ? clubs.find(c => c.clubId === created.clubId)?.clubName
                  : 'Unknown';

              const emailSubject = `New task assigned: ${created.title}`;
              const emailBody = `
                <div style="font-family:Arial,sans-serif; color:#111; line-height:1.5;">
                  <h2 style="margin:0 0 16px; color:#1f4e79;">New Task Assigned</h2>
                  <p style="margin:0 0 16px;">A new task has been assigned with the following details:</p>
                  <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                    <tr>
                      <td style="padding:10px; font-weight:700; background:#f4f6fb; border:1px solid #e3e8ee; width:120px;">Title</td>
                      <td style="padding:10px; border:1px solid #e3e8ee;">${created.title}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; font-weight:700; background:#f4f6fb; border:1px solid #e3e8ee;">Description</td>
                      <td style="padding:10px; border:1px solid #e3e8ee;">${created.description || 'No description'}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; font-weight:700; background:#f4f6fb; border:1px solid #e3e8ee;">Related To</td>
                      <td style="padding:10px; border:1px solid #e3e8ee;">${entityName}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; font-weight:700; background:#f4f6fb; border:1px solid #e3e8ee;">Due Date</td>
                      <td style="padding:10px; border:1px solid #e3e8ee;">${created.dueDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; font-weight:700; background:#f4f6fb; border:1px solid #e3e8ee;">Status</td>
                      <td style="padding:10px; border:1px solid #e3e8ee;">${created.status}</td>
                    </tr>
                  </table>
                  <p style="margin:0 0 16px;">
                    <a href="${window.location.origin}/tasks?taskId=${created.taskId}" style="background:#1f4e79; color:#fff; padding:10px 20px; text-decoration:none; border-radius:4px; display:inline-block;">View Task Details</a>
                  </p>
                  <p style="margin:0;">Please review the task in the application.</p>
                </div>
              `;

              await sendPowerAutomateEmail(recipient, emailSubject, emailBody);
              showSuccess('Email Sent', 'Task notification email sent successfully.');
            } else {
              console.warn('Skipping task notification email because no recipient email address was available');
            }
          } catch (err) {
            console.error('Power Automate task email failed', err);
          }

          showSuccess("Task Created", `${created.title} created successfully`);
        } catch (err) {
          console.error("Create task API failed", err);
          showError("Error", "Failed to create task");

          // fallback: add locally
          setTasks(prev => [...prev, t]);
        }
      },

      updateTask: async (t) => {
        try {
          const updated = await updateTaskApi(t.taskId, {
            title: t.title,
            description: t.description,
            playerId: t.playerId,
            clubId: t.clubId,
            assignedToScoutId: t.assignedToScoutId,
            dueDate: t.dueDate,
            status: t.status,
            source: t.source,
          });

          setTasks(prev =>
            prev.map(x => x.taskId === updated.taskId ? updated : x)
          );
          showUpdate("Task Updated", `${updated.title} updated successfully`);
        } catch (err) {
          console.error("Update task API failed", err);
          showError("Error", "Failed to update task");
        }
      },

      deleteTask: async (id: string) => {
        try {
          await deleteTaskApi(id);
          setTasks(prev => prev.filter(t => t.taskId !== id));
          showSuccess("Task Deleted", "Task deleted successfully");
        } catch (err) {
          console.error("Delete task API failed", err);
          showError("Error", "Failed to delete task");
        }
      },


      // ===========================================================
      // ===========================================================

      addEmail: async (e) => {
        try {
          const emailRecord = {
            ...e,
            emailId: crypto.randomUUID(),
          };

          await sendPowerAutomateEmail(e.recipientEmail, e.subject, e.body);
          setEmails(prev => [...prev, emailRecord]);
          showSuccess('Email Sent', `Email to ${e.recipientEmail} sent successfully`);
        } catch (err) {
          console.error('Power Automate email failed', err);
          showError('Error', 'Failed to send email');
        }
      },

      updateEmail: async (e) => {
        try {
          const updated = await updateEmailApi(e.emailId, {
            recipientEmail: e.recipientEmail,
            subject: e.subject,
            body: e.body,
            sentByScoutId: e.sentByScoutId,
            sentAt: e.sentAt,
          });
          setEmails(prev => prev.map(x => x.emailId === updated.emailId ? updated : x));
          showUpdate('Email Updated', `Email to ${updated.recipientEmail} updated successfully`);
        } catch (err) {
          console.error('Update email API failed', err);
          showError('Error', 'Failed to update email');
        }
      },

      deleteEmail: async (id) => {
        try {
          await deleteEmailApi(id);
          setEmails(prev => prev.filter(e => e.emailId !== id));
          showSuccess('Email Deleted', 'Email deleted successfully');
        } catch (err) {
          console.error('Delete email API failed', err);
          showError('Error', 'Failed to delete email');
        }
      },

      // ===========================================================
      // ===========================================================


      addTemplate: async (t) => {
        try {
          const created = await createTemplateApi({
            templateName: t.templateName,
            templateType: t.templateType,
            subject: t.subject,
            body: t.body,
          });

          setTemplates(prev => [...prev, created]);
          showSuccess("Template Created", `${created.templateName} created successfully`);

        } catch (err) {
          console.error("Create template API failed", err);
          showError("Error", "Failed to create template");
        }
      },

      updateTemplate: async (t) => {
        try {
          const updated = await updateTemplateApi(t.templateId, {
            templateName: t.templateName,
            templateType: t.templateType,
            subject: t.subject,
            body: t.body,
          });

          setTemplates(prev =>
            prev.map(x => x.templateId === updated.templateId ? updated : x)
          );
          showUpdate("Template Updated", `${updated.templateName} updated successfully`);

        } catch (err) {
          console.error("Update template API failed", err);
          showError("Error", "Failed to update template");
        }
      },

      deleteTemplate: async (id: string) => {
        try {
          await deleteTemplateApi(id);

          setTemplates(prev =>
            prev.filter(x => x.templateId !== id)
          );
          showSuccess("Template Deleted", "Template deleted successfully");

        } catch (err) {
          console.error("Delete template API failed", err);
          showError("Error", "Failed to delete template");
        }
      },

      addScout: async (s) => {
        try {
          const created = await createScoutApi({
            scoutName: s.scoutName,
            roleName: s.roleName,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email,
            phoneNumber: s.phoneNumber,
            addressLine1: s.addressLine1,
            addressLine2: s.addressLine2,
            city: s.city,
            state: s.state,
            postalCode: s.postalCode,
            country: s.country,
            lockedAreas: s.lockedAreas,
            isShowPlayer: s.isShowPlayer,
          });

          setScouts(prev => [...prev, created]);
          showSuccess("Scout Created", `${created.scoutName} added successfully`);

        } catch (err) {
          console.error("Create scout API failed", err);
          showError("Error", "Failed to create scout");
        }
      },

      updateScout: async (s) => {
        try {
          console.log('PlayerContext.updateScout payload', {
            scoutId: s.scoutId,
            scoutName: s.scoutName,
            roleName: s.roleName,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email,
            phoneNumber: s.phoneNumber,
            addressLine1: s.addressLine1,
            addressLine2: s.addressLine2,
            city: s.city,
            state: s.state,
            postalCode: s.postalCode,
            country: s.country,
            lockedAreas: s.lockedAreas,
            isShowPlayer: s.isShowPlayer,
          });

          const updated = await updateScoutApi(s.scoutId, {
            scoutName: s.scoutName,
            roleName: s.roleName,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email,
            phoneNumber: s.phoneNumber,
            addressLine1: s.addressLine1,
            addressLine2: s.addressLine2,
            city: s.city,
            state: s.state,
            postalCode: s.postalCode,
            country: s.country,
            lockedAreas: s.lockedAreas,
            isShowPlayer: s.isShowPlayer,
          });

          setScouts(prev =>
            prev.map(x => x.scoutId === updated.scoutId ? updated : x)
          );
          showUpdate("Scout Updated", `${updated.scoutName} updated successfully`);

        } catch (err) {
          console.error("Update scout API failed", err);
          showError("Error", "Failed to update scout");
        }
      },

      deleteScout: async (id: string) => {
        try {
          await deleteScoutApi(id);

          setScouts(prev =>
            prev.filter(x => x.scoutId !== id)
          );
          showSuccess("Scout Deleted", "Scout deleted successfully");

        } catch (err) {
          console.error("Delete scout API failed", err);
          showError("Error", "Failed to delete scout");
        }
      },

      addContactRole: async (role: ContactRole) => {
        try {
          const created = await createContactRoleApi({
            roleName: role.roleName,
            description: role.description
          });

          setContactRoles(prev => [...prev, created]);
          showSuccess("Role Created", "Contact role created successfully");

        } catch (err) {
          console.error("Create contact role API failed", err);
          showError("Error", "Failed to create contact role");
        }
      },

      updateContactRole: async (role: ContactRole) => {
        try {
          const updated = await updateContactRoleApi(role.roleId, {
            roleName: role.roleName,
            description: role.description
          });

          setContactRoles(prev =>
            prev.map(x => x.roleId === role.roleId ? updated : x)
          );
          showSuccess("Role Updated", "Contact role updated successfully");

        } catch (err) {
          console.error("Update contact role API failed", err);
          showError("Error", "Failed to update contact role");
        }
      },

      deleteContactRole: async (id: string) => {
        try {
          await deleteContactRoleApi(id);

          setContactRoles(prev =>
            prev.filter(x => x.roleId !== id)
          );
          showSuccess("Role Deleted", "Contact role deleted successfully");

        } catch (err) {
          console.error("Delete contact role API failed", err);
          showError("Error", "Failed to delete contact role");
        }
      },

      addPlayerPosition: async (position: PlayerPosition) => {
        try {
          const created = await createPlayerPositionApi({
            positionCode: position.positionCode,
            positionName: position.positionName,
            description: position.description
          });

          setPlayerPositions(prev => [...prev, created]);
          showSuccess("Position Created", "Player position created successfully");

        } catch (err) {
          console.error("Create player position API failed", err);
          showError("Error", "Failed to create player position");
        }
      },

      updatePlayerPosition: async (position: PlayerPosition) => {
        try {
          const updated = await updatePlayerPositionApi(position.positionId, {
            positionCode: position.positionCode,
            positionName: position.positionName,
            description: position.description
          });

          setPlayerPositions(prev =>
            prev.map(x => x.positionId === position.positionId ? updated : x)
          );
          showSuccess("Position Updated", "Player position updated successfully");

        } catch (err) {
          console.error("Update player position API failed", err);
          showError("Error", "Failed to update player position");
        }
      },

      deletePlayerPosition: async (id: string) => {
        try {
          await deletePlayerPositionApi(id);

          setPlayerPositions(prev =>
            prev.filter(x => x.positionId !== id)
          );
          showSuccess("Position Deleted", "Player position deleted successfully");

        } catch (err) {
          console.error("Delete player position API failed", err);
          showError("Error", "Failed to delete player position");
        }
      },

      addSport: async (sport: Sport) => {
        try {
          const created = await createSportApi({
            sportName: sport.sportName
          });

          setSports(prev => [...prev, created]);
          showSuccess("Sport Created", "Sport created successfully");

        } catch (err) {
          console.error("Create sport API failed", err);
          showError("Error", "Failed to create sport");
        }
      },

      updateSport: async (sport: Sport) => {
        try {
          const updated = await updateSportApi(sport.sportId, {
            sportName: sport.sportName
          });

          setSports(prev =>
            prev.map(x => x.sportId === sport.sportId ? updated : x)
          );
          showSuccess("Sport Updated", "Sport updated successfully");

        } catch (err) {
          console.error("Update sport API failed", err);
          showError("Error", "Failed to update sport");
        }
      },

      deleteSport: async (id: number) => {
        try {
          await deleteSportApi(id);

          setSports(prev =>
            prev.filter(x => x.sportId !== id)
          );
          showSuccess("Sport Deleted", "Sport deleted successfully");

        } catch (err) {
          console.error("Delete sport API failed", err);
          showError("Error", "Failed to delete sport");
        }
      },

      addSportActivity: async (activity: SportActivity) => {
        try {
          const created = await createSportActivityApi({
            sportId: activity.sportId,
            activityName: activity.activityName
          });

          setSportActivities(prev => [...prev, created]);
          showSuccess("Activity Created", "Sport activity created successfully");

        } catch (err) {
          console.error("Create sport activity API failed", err);
          showError("Error", "Failed to create sport activity");
        }
      },

      updateSportActivity: async (activity: SportActivity) => {
        try {
          const updated = await updateSportActivityApi(activity.activityId, {
            sportId: activity.sportId,
            activityName: activity.activityName
          });

          setSportActivities(prev =>
            prev.map(x => x.activityId === activity.activityId ? updated : x)
          );
          showSuccess("Activity Updated", "Sport activity updated successfully");

        } catch (err) {
          console.error("Update sport activity API failed", err);
          showError("Error", "Failed to update sport activity");
        }
      },

      deleteSportActivity: async (id: number) => {
        try {
          await deleteSportActivityApi(id);

          setSportActivities(prev =>
            prev.filter(x => x.activityId !== id)
          );
          showSuccess("Activity Deleted", "Sport activity deleted successfully");

        } catch (err) {
          console.error("Delete sport activity API failed", err);
          showError("Error", "Failed to delete sport activity");
        }
      },

      generateAutoTasks,
    }}>
      {children}
    </AppContext.Provider>
  );
};