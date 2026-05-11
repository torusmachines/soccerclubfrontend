import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/PlayerContext';
import { isPlayerRole } from '@/lib/accessPolicy';

const MyProfileRedirect = () => {
  const { user } = useAuth();
  const { players } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/dashboard');
      return;
    }
    // Prefer server-provided loginUser when available
    if (user.loginUser && user.loginUser.type === 'Player' && user.loginUser.id) {
      navigate(`/players/${user.loginUser.id}?edit=true`, { replace: true });
      return;
    }

    if (isPlayerRole(user.role)) {
      const found = players.find(p => (p.player_email || '').trim().toLowerCase() === (user.email || '').trim().toLowerCase());
      if (found) {
        navigate(`/players/${found.id}?edit=true`, { replace: true });
        return;
      }
      // fallback to players list
      navigate('/players', { replace: true });
      return;
    }

    // Scouts and others: prefer loginUser id for scout when available
    if (user.loginUser && user.loginUser.type === 'Scout') {
      // open scouts list and rely on editMe query param handling
      navigate('/scouts?editMe=true', { replace: true });
      return;
    }

    if (user.role === 'Scout') {
      navigate('/scouts?editMe=true', { replace: true });
      return;
    }

    // Admin or fallback
    navigate('/dashboard');
  }, [user, players, navigate]);

  return null;
};

export default MyProfileRedirect;
