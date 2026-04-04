import { useEffect, useState } from 'react';
import client from '../api/client';

/**
 * Returns active courses from the database.
 * { courses: string[], courseObjects: Course[], loading: boolean }
 * courseObjects includes year_levels_offered: number[]
 */
export function useCourses() {
  const [courseObjects, setCourseObjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/courses')
      .then(res => setCourseObjects(res.data.filter(c => c.is_active)))
      .catch(() => setCourseObjects([]))
      .finally(() => setLoading(false));
  }, []);

  return {
    courses: courseObjects.map(c => c.code),
    courseObjects,
    loading,
  };
}
