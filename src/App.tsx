import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PlayerProvider } from "@/context/PlayerContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Players from "./pages/Players";
import PlayerProfile from "./pages/PlayerProfile";
import MyProfileRedirect from "./pages/MyProfileRedirect";
import Clubs from "./pages/Clubs";
import ClubProfile from "./pages/ClubProfile";
import Scouts from "./pages/Scouts";
import Tasks from "./pages/Tasks";
import Templates from "./pages/Templates";
import MatchingEngine from "./pages/MatchingEngine";
import {Commercial} from "./pages/Commercial";
import CompanyProfile from "./pages/Settings/CompanyProfile";
import ManageRoles from "./pages/Settings/ManageRoles";
import ManagePositions from "./pages/Settings/ManagePositions";
import SportsManagement from "./pages/Settings/SportsManagement";import Login from "./pages/Login";
import AcceptInvite from "./pages/AcceptInvite";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import { loadMockData } from "@/data/mockData";

const queryClient = new QueryClient();

// ── Data loader wrapper ──────────────────────────────────────────────────────
// Fetches all API data into mockData before rendering any page.
// Components stay completely unchanged — they still read from mockData directly.

type Status = "loading" | "ready" | "error";

function DataLoader({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadMockData()
      .then(() => setStatus("ready"))
      .catch((err) => {
        setErrorMsg(err?.message || "Failed to connect to API");
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-background">
        <p className="text-destructive font-medium">❌ {errorMsg}</p>
        <p className="text-muted-foreground text-xs">
          Make sure https://soccerclubbackend.onrender.com/api is running
        </p>
        <button
          onClick={() => { setStatus("loading"); loadMockData().then(() => setStatus("ready")).catch((err) => { setErrorMsg(err?.message || "Failed to connect to API"); setStatus("error"); }); }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Router Content ────────────────────────────────────────────────────────────

function RouterContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Checking authentication...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected routes — DataLoader only runs for authenticated users */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DataLoader>
              <AppLayout />
            </DataLoader>
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="players"
          element={
            <AdminRoute allowedRoles={["Admin", "Player", "Scout"]}>
              <Players />
            </AdminRoute>
          }
        />
        <Route path="players/:id" element={<PlayerProfile />} />
        <Route path="my-profile" element={<MyProfileRedirect />} />
        <Route path="clubs" element={<Clubs />} />
        <Route path="clubs/:id" element={<ClubProfile />} />
        <Route
          path="scouts"
          element={
            <AdminRoute allowedRoles={["Admin", "Player", "Scout"]}>
              <Scouts />
            </AdminRoute>
          }
        />
        <Route path="tasks" element={<Tasks />} />
        <Route
          path="templates"
          element={
            <AdminRoute>
              <Templates />
            </AdminRoute>
          }
        />
        <Route
          path="matching"
          element={
            <AdminRoute allowedRoles={["Admin", "Scout"]}>
              <MatchingEngine />
            </AdminRoute>
          }
        />
        <Route
          path="commercial"
          element={
            <AdminRoute>
              <Commercial />
            </AdminRoute>
          }
        />
        <Route
          path="settings/company-profile"
          element={
            <AdminRoute>
              <CompanyProfile />
            </AdminRoute>
          }
        />
        <Route
          path="settings/manage-roles"
          element={
            <AdminRoute>
              <ManageRoles />
            </AdminRoute>
          }
        />
        <Route
          path="settings/manage-positions"
          element={
            <AdminRoute>
              <ManagePositions />
            </AdminRoute>
          }
        />
        <Route
          path="settings/sports-management"
          element={
            <AdminRoute>
              <SportsManagement />
            </AdminRoute>
          }
        />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <PlayerProvider>
            <Toaster />
            <Sonner />
            <RouterContent />
          </PlayerProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;










// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { PlayerProvider } from "@/context/PlayerContext";
// import { AppLayout } from "@/components/layout/AppLayout";
// import Dashboard from "./pages/Dashboard";
// import Players from "./pages/Players";
// import PlayerProfile from "./pages/PlayerProfile";
// import Clubs from "./pages/Clubs";
// import ClubProfile from "./pages/ClubProfile";
// import Tasks from "./pages/Tasks";
// import Templates from "./pages/Templates";
// import MatchingEngine from "./pages/MatchingEngine";
// import NotFound from "./pages/NotFound";

// const queryClient = new QueryClient();

// const App = () => (
//   <QueryClientProvider client={queryClient}>
//     <TooltipProvider>
//       <PlayerProvider>
//         <Toaster />
//         <Sonner />
//         <BrowserRouter>
//           <Routes>
//             <Route path="/" element={<AppLayout />}>
//               <Route index element={<Navigate to="/dashboard" replace />} />
//               <Route path="dashboard" element={<Dashboard />} />
//               <Route path="players" element={<Players />} />
//               <Route path="players/:id" element={<PlayerProfile />} />
//               <Route path="clubs" element={<Clubs />} />
//               <Route path="clubs/:id" element={<ClubProfile />} />
//               <Route path="tasks" element={<Tasks />} />
//               <Route path="templates" element={<Templates />} />
//               <Route path="matching" element={<MatchingEngine />} />
//             </Route>
//             <Route path="*" element={<NotFound />} />
//           </Routes>
//         </BrowserRouter>
//       </PlayerProvider>
//     </TooltipProvider>
//   </QueryClientProvider>
// );

// export default App;
