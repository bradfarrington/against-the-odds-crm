import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import * as api from '../lib/api';
import { generateInvoicePdf } from '../lib/invoicePdf';
import { ArrowLeft, Save, Upload, X, Eye, SendHorizonal, Plus, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

const defaultTemplate = {
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    registrationNumber: '',
    logoUrl: '',
    accentColor: '#6366f1',
    paymentTerms: '',
    bankDetails: '',
    footerText: '',
};

const accentColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
    '#0ea5e9', '#1e293b',
];

export default function InvoiceTemplateDesigner() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { state, dispatch } = useData();
    const [form, setForm] = useState(defaultTemplate);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [testForm, setTestForm] = useState({
        companyName: 'Sample Organisation Ltd',
        contactName: 'John Smith',
        testEmail: '',
        invoiceNumber: 'TEST-2026-001',
    });
    const [testLineItems, setTestLineItems] = useState([
        { description: 'Workshop Delivery — Half Day', quantity: 2, unitPrice: 450 },
        { description: 'Materials & Handouts', quantity: 1, unitPrice: 75 },
        { description: 'Travel Expenses', quantity: 1, unitPrice: 35 },
    ]);
    const fileRef = useRef(null);

    // Load existing template
    useEffect(() => {
        if (state.invoiceTemplate) {
            setForm(prev => ({ ...prev, ...state.invoiceTemplate }));
        }
    }, [state.invoiceTemplate]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            // SVG can't be embedded in jsPDF — convert to PNG via canvas
            if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const size = 200; // render at 200px for crisp PDF output
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, size, size);
                    handleChange('logoUrl', canvas.toDataURL('image/png'));
                };
                img.src = dataUrl;
            } else {
                handleChange('logoUrl', dataUrl);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await api.upsertInvoiceTemplate({ ...form, id: state.invoiceTemplate?.id });
            dispatch({ type: ACTIONS.SET_INVOICE_TEMPLATE, payload: result, _skipApi: true });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            alert('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Sample data for preview
    const sampleInvoice = {
        invoiceNumber: 'ATO-2026-001',
        dateIssued: '2026-02-27',
        dateDue: '2026-03-27',
        companyName: 'Sample Organisation Ltd',
        companyAddress: '123 Example Street, Manchester, M1 2AB',
        lineItems: [
            { description: 'Workshop Delivery — Half Day', quantity: 2, unitPrice: 450 },
            { description: 'Materials & Handouts', quantity: 1, unitPrice: 75 },
            { description: 'Travel Expenses', quantity: 1, unitPrice: 35 },
        ],
    };

    const sampleTotal = sampleInvoice.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);

    // ─── Test Invoice Modal helpers ───
    const testTotal = testLineItems.reduce((s, li) => s + (parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0), 0);
    const addTestLineItem = () => setTestLineItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
    const removeTestLineItem = (idx) => setTestLineItems(prev => prev.filter((_, i) => i !== idx));
    const updateTestLineItem = (idx, field, value) => {
        setTestLineItems(prev => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
    };

    const handleSendTest = async () => {
        if (!testForm.testEmail || !testForm.testEmail.includes('@')) {
            alert('Please enter a valid email address.');
            return;
        }
        if (!user) { alert('Not logged in.'); return; }

        const { data: connection } = await supabase
            .from('user_oauth_connections')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
        if (!connection) {
            alert('Please connect your Outlook account in Settings first.');
            navigate('/settings');
            return;
        }

        setSendingTest(true);
        try {
            const testInvoice = {
                invoiceNumber: testForm.invoiceNumber,
                dateIssued: new Date().toISOString().split('T')[0],
                dateDue: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                amount: testTotal,
                description: 'Test Invoice',
            };
            const testCompany = {
                name: testForm.companyName,
                address: '',
            };
            const testContact = testForm.contactName ? {
                firstName: testForm.contactName.split(' ')[0],
                lastName: testForm.contactName.split(' ').slice(1).join(' '),
            } : null;

            const { base64, filename } = generateInvoicePdf({
                template: form,
                invoice: testInvoice,
                lineItems: testLineItems.filter(li => li.description.trim()),
                company: testCompany,
                contact: testContact,
            });

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const res = await fetch(`${supabaseUrl}/functions/v1/outlook-api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    action: 'sendMail',
                    linkedId: null,
                    linkedType: null,
                    toRecipients: [testForm.testEmail],
                    subject: `[TEST] Invoice ${testForm.invoiceNumber} from ${form.companyName || 'Against the Odds'}`,
                    bodyHtml: `<p>This is a <strong>test invoice</strong> sent from your CRM.</p><p>Amount: <strong>£${testTotal.toFixed(2)}</strong></p><p>If you received this with a PDF attachment, your invoice system is working correctly! 🎉</p>`,
                    attachments: [{ name: filename, contentType: 'application/pdf', contentBytes: base64 }],
                }),
            });

            if (!res.ok) throw new Error(await res.text());
            setShowTestModal(false);
            alert(`Test invoice sent to ${testForm.testEmail}!`);
        } catch (err) {
            console.error('Send test failed:', err);
            alert('Failed to send test: ' + err.message);
        } finally {
            setSendingTest(false);
        }
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginRight: 'var(--space-sm)' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1>Invoice Template Settings</h1>
                        <div className="page-header-subtitle">Configure your organisation details and invoice branding</div>
                    </div>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-secondary" onClick={() => setShowTestModal(true)}>
                        <SendHorizonal size={16} /> Send Test Invoice
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        <Save size={16} /> {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Settings'}
                    </button>
                </div>
            </div>

            <div className="page-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', alignItems: 'start' }}>

                    {/* LEFT — Settings Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                        {/* Organisation Details */}
                        <div className="card">
                            <div className="card-header"><h3>Organisation Details</h3></div>
                            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                {/* Logo */}
                                <div className="form-group">
                                    <label className="form-label">Logo</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                        {form.logoUrl ? (
                                            <div style={{ position: 'relative' }}>
                                                <img src={form.logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'white', padding: 4 }} />
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleChange('logoUrl', '')} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--bg-card)', borderRadius: '50%', width: 20, height: 20, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
                                                <Upload size={14} /> Upload Logo
                                            </button>
                                        )}
                                        <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Organisation Name</label>
                                    <input className="form-input" value={form.companyName} onChange={e => handleChange('companyName', e.target.value)} placeholder="Against the Odds Foundation" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Address</label>
                                    <textarea className="form-textarea" value={form.companyAddress} onChange={e => handleChange('companyAddress', e.target.value)} placeholder="123 High Street&#10;Manchester&#10;M1 2AB" rows={3} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input className="form-input" value={form.companyPhone} onChange={e => handleChange('companyPhone', e.target.value)} placeholder="0161 000 0000" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input className="form-input" value={form.companyEmail} onChange={e => handleChange('companyEmail', e.target.value)} placeholder="info@againsttheodds.org" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Charity / Registration Number</label>
                                    <input className="form-input" value={form.registrationNumber} onChange={e => handleChange('registrationNumber', e.target.value)} placeholder="Charity No. 1234567" />
                                </div>
                            </div>
                        </div>

                        {/* Invoice Branding */}
                        <div className="card">
                            <div className="card-header"><h3>Invoice Branding</h3></div>
                            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Accent Colour</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {accentColors.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => handleChange('accentColor', c)}
                                                style={{
                                                    width: 32, height: 32, borderRadius: '50%', border: form.accentColor === c ? '3px solid var(--text)' : '2px solid var(--border)',
                                                    background: c, cursor: 'pointer', transition: 'transform .15s',
                                                    transform: form.accentColor === c ? 'scale(1.15)' : 'scale(1)',
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Terms</label>
                                    <textarea className="form-textarea" value={form.paymentTerms} onChange={e => handleChange('paymentTerms', e.target.value)} placeholder="Payment due within 30 days of invoice date." rows={2} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Bank Details</label>
                                    <textarea className="form-textarea" value={form.bankDetails} onChange={e => handleChange('bankDetails', e.target.value)} placeholder="Sort Code: 00-00-00&#10;Account: 12345678&#10;Reference: Invoice Number" rows={3} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Footer Message</label>
                                    <textarea className="form-textarea" value={form.footerText} onChange={e => handleChange('footerText', e.target.value)} placeholder="Thank you for your support!" rows={2} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT — Live Preview */}
                    <div className="card" style={{ position: 'sticky', top: 'var(--space-lg)' }}>
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}><Eye size={18} /> Live Preview</h3>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            <div style={{
                                background: 'white', color: '#1a1a1a', padding: 32, fontSize: 11,
                                fontFamily: "'Inter', -apple-system, sans-serif", lineHeight: 1.5, minHeight: 500,
                            }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: `3px solid ${form.accentColor}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {form.logoUrl && <img src={form.logoUrl} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />}
                                        <div>
                                            {form.companyName && <div style={{ fontSize: 16, fontWeight: 700, color: form.accentColor }}>{form.companyName}</div>}
                                            <div style={{ whiteSpace: 'pre-line', color: '#666', fontSize: 9 }}>{form.companyAddress}</div>
                                            {form.companyPhone && <div style={{ color: '#666', fontSize: 9 }}>{form.companyPhone}</div>}
                                            {form.companyEmail && <div style={{ color: '#666', fontSize: 9 }}>{form.companyEmail}</div>}
                                            {form.registrationNumber && <div style={{ color: '#999', fontSize: 8, marginTop: 2 }}>{form.registrationNumber}</div>}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: form.accentColor, letterSpacing: 1 }}>INVOICE</div>
                                        <div style={{ color: '#666', marginTop: 4 }}>{sampleInvoice.invoiceNumber}</div>
                                    </div>
                                </div>

                                {/* Client + Dates */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 9, textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Bill To</div>
                                        <div style={{ fontWeight: 600 }}>{sampleInvoice.companyName}</div>
                                        <div style={{ color: '#666', fontSize: 9 }}>{sampleInvoice.companyAddress}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div><span style={{ color: '#999', fontSize: 9 }}>Issued: </span>{sampleInvoice.dateIssued}</div>
                                        <div><span style={{ color: '#999', fontSize: 9 }}>Due: </span>{sampleInvoice.dateDue}</div>
                                    </div>
                                </div>

                                {/* Line Items Table */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                                    <thead>
                                        <tr style={{ background: form.accentColor, color: 'white' }}>
                                            <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9 }}>Description</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, width: 40 }}>Qty</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, width: 60 }}>Price</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 9, width: 60 }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sampleInvoice.lineItems.map((li, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '6px 8px' }}>{li.description}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>{li.quantity}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right' }}>£{li.unitPrice.toFixed(2)}</td>
                                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>£{(li.quantity * li.unitPrice).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Total */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                                    <div style={{ width: 180, padding: '8px 12px', background: `${form.accentColor}15`, borderRadius: 6 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, color: form.accentColor }}>
                                            <span>Total</span>
                                            <span>£{sampleTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Terms / Bank Details */}
                                {(form.paymentTerms || form.bankDetails) && (
                                    <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginBottom: 16 }}>
                                        {form.paymentTerms && (
                                            <div style={{ marginBottom: 8 }}>
                                                <div style={{ fontWeight: 600, fontSize: 9, textTransform: 'uppercase', color: '#999', marginBottom: 2 }}>Payment Terms</div>
                                                <div style={{ whiteSpace: 'pre-line', fontSize: 9, color: '#444' }}>{form.paymentTerms}</div>
                                            </div>
                                        )}
                                        {form.bankDetails && (
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 9, textTransform: 'uppercase', color: '#999', marginBottom: 2 }}>Bank Details</div>
                                                <div style={{ whiteSpace: 'pre-line', fontSize: 9, color: '#444' }}>{form.bankDetails}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Footer */}
                                {form.footerText && (
                                    <div style={{ textAlign: 'center', color: '#666', fontSize: 12, fontFamily: "'Unbounded', cursive", fontWeight: 500, borderTop: '1px solid #eee', paddingTop: 14 }}>
                                        {form.footerText}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showTestModal && (
                <Modal isOpen={true} onClose={() => setShowTestModal(false)} title="Send Test Invoice" large>
                    <div className="modal-body">
                        <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 13, color: 'var(--text-secondary)' }}>
                            This will generate a PDF using your current template settings and send it to the test email address below. No invoice record is created.
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Invoice Number</label>
                                <input className="form-input" value={testForm.invoiceNumber} onChange={e => setTestForm(prev => ({ ...prev, invoiceNumber: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Send To Email *</label>
                                <input className="form-input" type="email" value={testForm.testEmail} onChange={e => setTestForm(prev => ({ ...prev, testEmail: e.target.value }))} placeholder="test@example.com" required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Client / Organisation Name</label>
                                <input className="form-input" value={testForm.companyName} onChange={e => setTestForm(prev => ({ ...prev, companyName: e.target.value }))} placeholder="Sample Organisation Ltd" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contact Name</label>
                                <input className="form-input" value={testForm.contactName} onChange={e => setTestForm(prev => ({ ...prev, contactName: e.target.value }))} placeholder="John Smith" />
                            </div>
                        </div>

                        {/* Line Items */}
                        <div style={{ marginTop: 'var(--space-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                                <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Line Items</label>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={addTestLineItem}>
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px 32px', gap: 'var(--space-sm)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, padding: '0 0 4px 0' }}>
                                    <span>Description</span>
                                    <span style={{ textAlign: 'center' }}>Qty</span>
                                    <span style={{ textAlign: 'right' }}>Unit Price</span>
                                    <span style={{ textAlign: 'right' }}>Total</span>
                                    <span></span>
                                </div>
                                {testLineItems.map((li, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px 32px', gap: 'var(--space-sm)', alignItems: 'center' }}>
                                        <input className="form-input" value={li.description} onChange={e => updateTestLineItem(idx, 'description', e.target.value)} placeholder="Item description…" style={{ fontSize: 13 }} />
                                        <input className="form-input" type="number" min="0" step="1" value={li.quantity} onChange={e => updateTestLineItem(idx, 'quantity', e.target.value)} style={{ textAlign: 'center', fontSize: 13 }} />
                                        <input className="form-input" type="number" min="0" step="0.01" value={li.unitPrice} onChange={e => updateTestLineItem(idx, 'unitPrice', e.target.value)} style={{ textAlign: 'right', fontSize: 13 }} />
                                        <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                                            £{((parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0)).toFixed(2)}
                                        </div>
                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeTestLineItem(idx)} style={{ padding: 4 }}>
                                            <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                                        </button>
                                    </div>
                                ))}
                                {testLineItems.length === 0 && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-md)', fontSize: 13 }}>
                                        No line items. Click "Add Item" to start.
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Total:</span>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>£{testTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowTestModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSendTest} disabled={sendingTest}>
                            <SendHorizonal size={16} /> {sendingTest ? 'Sending…' : 'Send Test Invoice'}
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
}
