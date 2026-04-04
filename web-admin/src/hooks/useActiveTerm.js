import { useEffect, useState } from 'react';
import client from '../api/client';

/**
 * Returns the currently active academic term from Academic Settings.
 * { schoolYear, semester, label, loading, activeTerm }
 */
export function useActiveTerm() {
  const [activeTerm, setActiveTerm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/academic-settings/active')
      .then(res => setActiveTerm(res.data?.school_year ? res.data : null))
      .catch(() => setActiveTerm(null))
      .finally(() => setLoading(false));
  }, []);

  return {
    activeTerm,
    schoolYear: activeTerm?.school_year || '',
    semester: activeTerm?.semester || '',
    label: activeTerm?.label || (activeTerm ? `${activeTerm.school_year} — ${activeTerm.semester} Semester` : ''),
    loading,
  };
}
