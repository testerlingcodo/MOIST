import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const ROLE_BADGE = {
  admin: { variant: 'danger', label: 'Admin' },
  staff: { variant: 'info', label: 'Staff' },
  teacher: { variant: 'warning', label: 'Teacher' },
  dean: { variant: 'success', label: 'Dean' },
  registrar: { variant: 'info', label: 'Registrar' },
  cashier: { variant: 'warning', label: 'Cashier' },
  student: { variant: 'gray', label: 'Student' },
};

function UserForm({ defaultValues, onSubmit, onCancel, isEdit }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Email *</label>
        <input {...register('email', { required: true })} type="email" className="input" />
        {errors.email && <p className="field-error">Required</p>}
      </div>

      {!isEdit && (
        <div>
          <label className="label">Password *</label>
          <input
            {...register('password', { required: !isEdit })}
            type="password"
            className="input"
            placeholder="Min 8 characters"
          />
          {errors.password && <p className="field-error">Required</p>}
        </div>
      )}

      <div>
        <label className="label">Role *</label>
        <select {...register('role', { required: true })} className="input">
          <option value="">Select role</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="dean">Dean</option>
          <option value="registrar">Registrar</option>
          <option value="cashier">Cashier</option>
        </select>
        {errors.role && <p className="field-error">Required</p>}
        <div className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 space-y-1">
          <p><span className="font-semibold text-slate-700">Admin</span> - Full access to all modules</p>
          <p><span className="font-semibold text-slate-700">Staff</span> - Approve batches and manage students, payments, grades</p>
          <p><span className="font-semibold text-slate-700">Dean</span> - Add subjects and evaluate enrollment batches</p>
          <p><span className="font-semibold text-slate-700">Registrar</span> - Register approved batches and manage student records</p>
          <p><span className="font-semibold text-slate-700">Cashier</span> - Handle balances, payment links, and payment history</p>
          <p><span className="font-semibold text-slate-700">Teachers</span> - Managed separately on the Teachers page</p>
        </div>
      </div>

      {isEdit && (
        <div>
          <label className="label">New Password</label>
          <input
            {...register('password')}
            type="password"
            className="input"
            placeholder="Leave blank to keep current"
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { confirm, confirmProps } = useConfirm();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, user: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/users', { params: { page, limit: 20 } });
      setUsers(res.data.data);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (data) => {
    try {
      const payload = { ...data };
      if (modal.user && !payload.password) delete payload.password;

      if (modal.user) {
        await client.patch(`/users/${modal.user.id}`, payload);
        toast.success('User updated');
      } else {
        await client.post('/users', payload);
        toast.success('User created');
      }

      setModal({ open: false, user: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    }
  };

  const handleToggle = async (user) => {
    if (!await confirm({ title: `${user.is_active ? 'Deactivate' : 'Activate'} User`, message: `${user.is_active ? 'Deactivate' : 'Activate'} this account?`, confirmLabel: user.is_active ? 'Deactivate' : 'Activate', variant: user.is_active ? 'danger' : 'info' })) return;

    try {
      await client.patch(`/users/${user.id}`, { is_active: !user.is_active });
      toast.success(user.is_active ? 'User deactivated' : 'User activated');
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{total} accounts</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({ open: true, user: null })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add User
        </button>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {['Email', 'Role', 'Status', 'Created', 'Actions'].map((header) => (
                <th key={header} className="table-header-cell">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="table-cell py-12 text-center text-slate-400">Loading...</td></tr>
            ) : users.map((user) => {
              const roleBadge = ROLE_BADGE[user.role] || { variant: 'gray', label: user.role };
              return (
                <tr key={user.id} className="table-row">
                  <td className="table-cell font-medium text-slate-900">{user.email}</td>
                  <td className="table-cell">
                    <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                  </td>
                  <td className="table-cell">
                    <Badge variant={user.is_active ? 'success' : 'gray'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="table-cell text-slate-500 text-xs">{formatDate(user.created_at)}</td>
                  <td className="table-cell">
                    <div className="flex gap-3">
                      <button
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        onClick={() => setModal({ open: true, user })}
                      >
                        Edit
                      </button>
                      <button
                        className={`text-xs font-medium ${user.is_active ? 'text-slate-400 hover:text-red-500' : 'text-slate-400 hover:text-emerald-600'}`}
                        onClick={() => handleToggle(user)}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((current) => current - 1)} disabled={page === 1}>Prev</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((current) => current + 1)} disabled={page === totalPages}>Next</button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, user: null })}
        title={modal.user ? 'Edit User' : 'Add User'}
      >
        <UserForm
          defaultValues={modal.user ? { email: modal.user.email, role: modal.user.role } : {}}
          onSubmit={handleSave}
          onCancel={() => setModal({ open: false, user: null })}
          isEdit={!!modal.user}
        />
      </Modal>
      <ConfirmModal {...confirmProps} />
    </div>
  );
}
