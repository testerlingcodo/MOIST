'use strict';

const service = require('./enrollment_batches.service');
const audit = require('../audit_logs/audit_logs.service');

function actor(req) {
  return {
    actor_id: req.user?.sub,
    actor_name: req.user?.name || req.user?.email || req.user?.sub,
    actor_role: req.user?.role,
  };
}

async function list(req, res, next) {
  try {
    const { page, limit, status, school_year, semester, course, search } = req.query;
    const result = await service.list({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      school_year,
      semester,
      course,
      search,
      student_id: req.user.role === 'student' ? req.user.studentId : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const batch = await service.getById(req.params.id);
    if (req.user.role === 'student' && batch.student_id !== req.user.studentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(batch);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { student_id, school_year, semester, subject_ids } = req.body;
    const isStudent = req.user.role === 'student';

    if (isStudent && !req.user.studentId) {
      return res.status(403).json({ error: 'Student account is not linked to a student record' });
    }

    const batch = await service.create({
      student_id: isStudent ? req.user.studentId : student_id,
      school_year,
      semester,
      created_by: req.user.sub,
      subject_ids: isStudent ? subject_ids : [],
      status: isStudent ? 'for_subject_enrollment' : 'pending',
    });
    res.status(201).json(batch);
  } catch (err) {
    next(err);
  }
}

async function submitForEvaluation(req, res, next) {
  try {
    const batch = await service.submitForEvaluation(req.params.id);
    audit.log({ ...actor(req), action: 'submit_for_subject_enrollment', entity: 'enrollment_batch', entity_id: batch.id, description: `Sent batch for subject enrollment (${batch.last_name}, ${batch.first_name} — ${batch.school_year} ${batch.semester})` });
    res.json(batch);
  } catch (err) {
    next(err);
  }
}

async function evaluate(req, res, next) {
  try {
    const { subject_ids, dean_notes, include_advanced, credited_subjects } = req.body;
    const batch = await service.evaluate(req.params.id, {
      subject_ids,
      dean_notes,
      include_advanced,
      credited_subjects,
      dean_id: req.user.sub,
    });
    const creditedCount = Array.isArray(credited_subjects) ? credited_subjects.length : 0;
    audit.log({ ...actor(req), action: 'subject_enrollment', entity: 'enrollment_batch', entity_id: batch.id, description: `Enrolled ${subject_ids?.length || 0} subject(s)${creditedCount > 0 ? `, credited ${creditedCount} subject(s)` : ''} for ${batch.last_name}, ${batch.first_name} — ${batch.school_year} ${batch.semester}` });
    res.json(batch);
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const batch = await service.approve(req.params.id, {
      approved_by: req.user.sub,
    });
    audit.log({ ...actor(req), action: 'approve_assessment', entity: 'enrollment_batch', entity_id: batch.id, description: `Approved assessment for ${batch.last_name}, ${batch.first_name} — ${batch.school_year} ${batch.semester}` });
    res.json(batch);
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const batch = await service.register(req.params.id, {
      registered_by: req.user.sub,
    });
    audit.log({ ...actor(req), action: 'confirm_payment_enrolled', entity: 'enrollment_batch', entity_id: batch.id, description: `Payment confirmed. ${batch.last_name}, ${batch.first_name} enrolled — ${batch.school_year} ${batch.semester}` });
    res.json(batch);
  } catch (err) {
    next(err);
  }
}

async function getAvailableSubjects(req, res, next) {
  try {
    res.json(await service.getAvailableSubjects(req.params.id, {
      includeAdvanced: ['1', 'true', 'yes'].includes(String(req.query.include_advanced || '').toLowerCase()),
    }));
  } catch (err) {
    next(err);
  }
}

async function getCreditableSubjects(req, res, next) {
  try {
    res.json(await service.getCreditableSubjects(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function getPreEnrollmentSubjects(req, res, next) {
  try {
    if (!req.user.studentId) {
      return res.status(403).json({ error: 'Student account is not linked to a student record' });
    }
    res.json(await service.getPreEnrollmentSubjects(req.user.studentId));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function listUnenrolled(req, res, next) {
  try {
    const { school_year, semester, course } = req.query;
    res.json(await service.listUnenrolled({ school_year, semester, course }));
  } catch (err) { next(err); }
}

async function listCourses(req, res, next) {
  try {
    res.json(await service.listCourses());
  } catch (err) { next(err); }
}

async function listAssessments(req, res, next) {
  try {
    const { page, limit, school_year, semester, course, year_level, search } = req.query;
    res.json(await service.listAssessments({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      school_year, semester, course, year_level, search,
    }));
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, submitForEvaluation, evaluate, approve, register, remove, listUnenrolled, listCourses, listAssessments, getAvailableSubjects, getPreEnrollmentSubjects, getCreditableSubjects };
