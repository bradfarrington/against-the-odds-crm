import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Mail, Phone, X, UserCircle } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const statusMap = { Active: 'success', Inactive: 'neutral' };
const deptColors = { Leadership: 'var(--primary)', Recovery: 'var(--success)', Prevention: 'var(--warning)', Operations: 'var(--info)' };

export default function StaffHub() {
    const { state, dispatch, ACTIONS } = useData();
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    const staff = state.staff || [];

    const departments = [...new Set(staff.map(s => s.department))];

    const handleSave = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        if (editItem) {
            dispatch({ type: ACTIONS.UPDATE_STAFF, payload: { id: editItem.id, ...data } });
        } else {
            dispatch({ type: ACTIONS.ADD_STAFF, payload: data });
        }
        setShowModal(false);
        setEditItem(null);
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
                                <div key={s.id} className="card staff-card" onClick={() => { setEditItem(s); setShowModal(true); }} style={{ cursor: 'pointer' }}>
                                    <div className="card-body">
                                        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                                            <div className="staff-avatar" style={{ '--dept-color': deptColors[s.department] || 'var(--primary)' }}>
                                                {s.firstName[0]}{s.lastName[0]}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 16 }}>{s.firstName} {s.lastName}</div>
                                                        <div style={{ fontSize: 13, color: 'var(--primary)', marginTop: 2 }}>{s.role}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <StatusBadge status={s.status} map={statusMap} />
                                                        <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(s.id, e)}><X style={{ width: 14, height: 14 }} /></button>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>{s.bio}</div>
                                                <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-md)', fontSize: 13, color: 'var(--text-secondary)' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail style={{ width: 14, height: 14 }} />{s.email}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone style={{ width: 14, height: 14 }} />{s.phone}</span>
                                                </div>
                                            </div>
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
                <Modal onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? 'Edit Staff Member' : 'Add Staff Member'}>
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
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <input className="form-input" name="role" defaultValue={editItem?.role} required />
                            </div>
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
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditItem(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary">{editItem ? 'Save Changes' : 'Add Staff'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}
