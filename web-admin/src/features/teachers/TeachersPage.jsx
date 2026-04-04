import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

function TeacherForm({ defaultValues, onSubmit, onCancel, isEdit }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">First Name *</label>
          <input {...register('first_name', { required: true })} className="input" />
          {errors.first_name && <p className="field-error">Required</p>}
        </div>
        <div>
          <label className="label">Last Name *</label>
          <input {...register('last_name', { required: true })} className="input" />
          {errors.last_name && <p className="field-error">Required</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Middle Name</label>
          <input {...register('middle_name')} className="input" />
        </div>
        <div>
          <label className="label">Contact Number</label>
          <input {...register('contact_number')} className="input" />
        </div>
      </div>

      <div>
        <label className="label">Specialization</label>
        <input {...register('specialization')} className="input" placeholder="e.g. Programming, Networking, Accounting" />
      </div>

      <div>
        <label className="label">Email *</label>
        <input {...register('email', { required: true })} type="email" className="input" />
        {errors.email && <p className="field-error">Required</p>}
      </div>

      <div>
        <label className="label">{isEdit ? 'New Password' : 'Password *'}</label>
        <input
          {...register('password', { required: !isEdit })}
          type="password"
          className="input"
          placeholder={isEdit ? 'Leave blank to keep current password' : 'Min 8 characters'}
        />
        {errors.password && <p className="field-error">Required</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create Teacher'}
        </button>
      </div>
    </form>
  );
}

export default function TeachersPage() {
  const { confirm, confirmProps } = useConfirm();
  const role = useSelector((state) => state.auth.user?.role);
  const canManage = role === 'admin' || role === 'registrar';

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, teacher: null, formVersion: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/teachers', { params: { limit: 100, search: search || undefined } });
      setTeachers(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    try {
      const payload = { ...data };
      if (modal.teacher && !payload.password) delete payload.password;

      if (modal.teacher) {
        const res = await client.patch(`/teachers/${modal.teacher.id}`, payload);
        toast.success('Teacher updated');
        setModal(prev => ({ ...prev, teacher: res.data, formVersion: prev.formVersion + 1 }));
      } else {
        await client.post('/teachers', payload);
        toast.success('Teacher created');
        setModal({ open: false, teacher: null });
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const handleToggleActive = async (teacher) => {
    const nextIsActive = !teacher.is_active;
    if (!await confirm({ title: `${nextIsActive ? 'Activate' : 'Deactivate'} Teacher`, message: `${teacher.last_name}, ${teacher.first_name}`, confirmLabel: nextIsActive ? 'Activate' : 'Deactivate', variant: nextIsActive ? 'info' : 'danger' })) return;

    try {
      await client.patch(`/teachers/${teacher.id}`, { is_active: nextIsActive });
      toast.success(nextIsActive ? 'Teacher activated' : 'Teacher deactivated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  return (
    <div className="p-5 lg:p-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="page-subtitle">Manage teacher profiles</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setModal({ open: true, teacher: null })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Teacher
          </button>
        )}
      </div>

      <div className="card mb-5">
        <input
          type="text"
          className="input max-w-sm"
          placeholder="Search by name, email, or subject code"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {['Teacher', 'Contact', 'Specialization', 'Teaching Load', 'Status', 'Actions'].map((header) => (
                <th key={header} className="table-header-cell">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">Loading...</td></tr>
            ) : teachers.length === 0 ? (
              <tr><td colSpan={6} className="table-cell py-12 text-center text-slate-400">No teachers found</td></tr>
            ) : teachers.map((teacher) => (
              <tr key={teacher.id} className="table-row">
                <td className="table-cell">
                  <div className="font-semibold text-slate-900">
                    {teacher.last_name}, {teacher.first_name}
                  </div>
                  <div className="text-xs text-slate-500">{teacher.email}</div>
                </td>
                <td className="table-cell text-slate-600">{teacher.contact_number || '-'}</td>
                <td className="table-cell text-slate-600 text-sm">{teacher.specialization || '-'}</td>
                <td className="table-cell">
                  {teacher.assigned_subject_count > 0 ? (
                    <div>
                      <div className="text-sm font-medium text-slate-700">{teacher.assigned_subject_count} subject{teacher.assigned_subject_count !== 1 ? 's' : ''}</div>
                      <div className="text-xs text-slate-400 max-w-xs truncate">{teacher.assigned_subject_summary}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">No load assigned</span>
                  )}
                </td>
                <td className="table-cell">
                  <Badge variant={teacher.is_active ? 'success' : 'gray'}>
                    {teacher.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="table-cell">
                  {canManage ? (
                    <div className="flex gap-3">
                      <button
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        onClick={() => setModal({ open: true, teacher, formVersion: 0 })}
                      >
                        Edit
                      </button>
                      <button
                        className={`text-xs font-medium ${teacher.is_active ? 'text-red-500 hover:text-red-600' : 'text-emerald-600 hover:text-emerald-700'}`}
                        onClick={() => handleToggleActive(teacher)}
                      >
                        {teacher.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">View only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, teacher: null })}
        title={modal.teacher ? `${modal.teacher.last_name}, ${modal.teacher.first_name}` : 'Add Teacher'}
        size="lg"
      >
        <TeacherForm
          key={modal.formVersion}
          defaultValues={modal.teacher}
          onSubmit={handleSave}
          onCancel={() => setModal({ open: false, teacher: null, formVersion: 0 })}
          isEdit={!!modal.teacher}
        />
      </Modal>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
