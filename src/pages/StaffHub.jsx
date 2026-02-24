import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Mail, Phone, X, UserCircle } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const statusMap = { Active: 'success', Inactive: 'neutral' };
const deptColors = { Leadership: 'var(--primary)', Recovery: 'var(--success)', Prevention: 'var(--warning)', Operations: 'var(--info)' };

export default function StaffHub() {
    const { state, dispatch, ACTIONS } = useData();
    const { session } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const staff = state.staff || [];
    // Only allow users with the "admin" dashboard_role to create new staff
    const currentUserStaffRecord = staff.find(s => s.id === session?.user?.id);
    const isAdmin = currentUserStaffRecord ? currentUserStaffRecord.dashboardRole === 'admin' : false;

    const departments = [...new Set(staff.map(s => s.department))];

    const handleSave = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        const { password, ...staffData } = data;

        setIsSaving(true);
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_STAFF, payload: { id: editItem.id, ...staffData } });
            setShowModal(false);
            setEditItem(null);
            setIsSaving(false);
        } else {
            try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const res = await fetch(`${supabaseUrl}/functions/v1/admin-create-user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify(data) // Includes password
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to create user');
                }

                const result = await res.json();
                dispatch({ type: ACTIONS.ADD_STAFF, payload: result.staff });
                setShowModal(false);
                setEditItem(null);
            } catch (err) {
                alert(err.message);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (confirm('Remove this staff member?')) dispatch({ type: ACTIONS.DELETE_STAFF, payload: id });
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>ATO Staff Hub</h1>
                    <div className="page-header-subtitle">{staff.filter(s => s.status === 'Active').length} active team member{staff.filter(s => s.status === 'Active').length !== 1 ? 's' : ''}</div>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
                        <Plus /> Add Staff
                    </button>
                </div>
            </div>
            <div className="page-body">
                {departments.map(dept => (
                    <div key={dept} style={{ marginBottom: 'var(--space-xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: deptColors[dept] || 'var(--text-muted)' }} />
                            <h3 style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>{dept}</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
                            {staff.filter(s => s.department === dept).map(s => (
                                <div key={s.id} className="card staff-card" onClick={() => { setEditItem(s); setShowModal(true); }} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                                            <StatusBadge status={s.status} map={statusMap} />
                                            {isAdmin && (
                                                <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(s.id, e)} style={{ padding: 4, height: 'auto', color: 'var(--text-muted)' }}><X size={16} /></button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                                            <div className="staff-avatar" style={{ '--dept-color': deptColors[s.department] || 'var(--primary)', width: 64, height: 64, fontSize: 24, marginBottom: 'var(--space-sm)' }}>
                                                {s.firstName[0]}{s.lastName[0]}
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--text-main)' }}>{s.firstName} {s.lastName}</div>
                                            <div style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 500, marginTop: 4 }}>{s.role}</div>
                                            <div style={{ fontSize: 12, backgroundColor: 'var(--surface-sunken)', padding: '2px 8px', borderRadius: 12, marginTop: 8, color: 'var(--text-secondary)' }}>
                                                {s.dashboardRole === 'admin' ? 'Administrator' : 'Standard User'}
                                            </div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            {s.bio && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 'var(--space-md)', fontStyle: 'italic' }}>"{s.bio}"</div>}
                                        </div>
                                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis' }}><Mail size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> {s.email}</span>
                                            {s.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> {s.phone}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {staff.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-2xl)' }}>No staff members</div>}
            </div>

            {showModal && (
                <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Edit Staff Member' : 'Add Staff Member'}>
                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input className="form-input" name="firstName" defaultValue={editItem?.firstName} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input className="form-input" name="lastName" defaultValue={editItem?.lastName} required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Role (Job Title)</label>
                                    <select className="form-select" name="role" defaultValue={editItem?.role || 'Staff'}>
                                        <option value="Executive Director">Executive Director</option>
                                        <option value="Operations Manager">Operations Manager</option>
                                        <option value="Recovery Coach">Recovery Coach</option>
                                        <option value="Prevention Specialist">Prevention Specialist</option>
                                        <option value="Volunteer Coordinator">Volunteer Coordinator</option>
                                        <option value="Marketing & Outreach">Marketing & Outreach</option>
                                        <option value="Administrator">Administrator</option>
                                        <option value="Staff">Staff</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">System Permission</label>
                                    <select className="form-select" name="dashboard_role" defaultValue={editItem?.dashboardRole || 'user'} required>
                                        <option value="user">Standard User</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                            </div>
                            {!editItem && (
                                <div className="form-group">
                                    <label className="form-label">Temporary Password</label>
                                    <input className="form-input" name="password" type="text" placeholder="Ensure it is at least 6 characters" required minLength={6} />
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                        The staff member will use this to securely log in for the first time.
                                    </div>
                                </div>
                            )}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-input" name="email" type="email" defaultValue={editItem?.email} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" name="phone" defaultValue={editItem?.phone} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <select className="form-select" name="department" defaultValue={editItem?.department || 'Operations'}>
                                        <option>Leadership</option><option>Recovery</option><option>Prevention</option><option>Operations</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" name="status" defaultValue={editItem?.status || 'Active'}>
                                        <option>Active</option><option>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bio</label>
                                <textarea className="form-textarea" name="bio" defaultValue={editItem?.bio} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" disabled={isSaving} onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                {isSaving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Staff'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
