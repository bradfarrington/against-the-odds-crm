import jsPDF from 'jspdf';

/**
 * Generate an invoice PDF.
 *
 * @param {Object} opts
 * @param {Object} opts.template  — invoice template settings (logo, colours, etc.)
 * @param {Object} opts.invoice   — the invoice record
 * @param {Array}  opts.lineItems — array of { description, quantity, unitPrice }
 * @param {Object} opts.company   — the client company record
 * @param {Object} opts.contact   — optional contact person
 * @returns {{ blob: Blob, base64: string, filename: string }}
 */
export function generateInvoicePdf({ template = {}, invoice, lineItems = [], company, contact }) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    const accent = template.accentColor || '#6366f1';
    let y = margin;

    // ─── Helpers ───
    const hexToRgb = (hex) => {
        const h = hex.replace('#', '');
        return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    };

    const setColor = (hex) => {
        const [r, g, b] = hexToRgb(hex);
        doc.setTextColor(r, g, b);
    };

    const setDrawColor = (hex) => {
        const [r, g, b] = hexToRgb(hex);
        doc.setDrawColor(r, g, b);
    };

    const setFillColor = (hex) => {
        const [r, g, b] = hexToRgb(hex);
        doc.setFillColor(r, g, b);
    };

    const fmtDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const fmtCurrency = (n) => `£${(n || 0).toFixed(2)}`;

    // ─── Logo + Company header ───
    // Logo is skipped in PDF (base64 image embedding is complex and flaky in jsPDF)
    // We'll still include the company name prominently
    if (template.logoUrl && template.logoUrl.startsWith('data:image')) {
        try {
            doc.addImage(template.logoUrl, 'PNG', margin, y, 20, 20);
        } catch (e) {
            // Logo failed — skip
        }
    }

    const logoOffset = (template.logoUrl && template.logoUrl.startsWith('data:image')) ? 24 : 0;

    // Organisation name
    if (template.companyName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        setColor(accent);
        doc.text(template.companyName, margin + logoOffset, y + 6);
    }

    // Organisation details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor('#666666');
    let detailY = y + 10;
    if (template.companyAddress) {
        const lines = template.companyAddress.split('\n');
        lines.forEach(line => {
            doc.text(line, margin + logoOffset, detailY);
            detailY += 3.5;
        });
    }
    if (template.companyPhone) { doc.text(template.companyPhone, margin + logoOffset, detailY); detailY += 3.5; }
    if (template.companyEmail) { doc.text(template.companyEmail, margin + logoOffset, detailY); detailY += 3.5; }
    if (template.registrationNumber) {
        doc.setFontSize(7);
        setColor('#999999');
        doc.text(template.registrationNumber, margin + logoOffset, detailY);
        detailY += 3.5;
    }

    // "INVOICE" title — right aligned
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    setColor(accent);
    doc.text('INVOICE', pageWidth - margin, y + 6, { align: 'right' });

    // Invoice number — right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor('#666666');
    doc.text(invoice.invoiceNumber || '', pageWidth - margin, y + 12, { align: 'right' });

    y = Math.max(detailY, y + 20) + 4;

    // Accent line
    setFillColor(accent);
    doc.rect(margin, y, contentWidth, 1.5, 'F');
    y += 8;

    // ─── Bill-To + Dates ───
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    setColor('#999999');
    doc.text('BILL TO', margin, y);
    doc.text('DATE DETAILS', pageWidth - margin - 50, y);
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor('#1a1a1a');
    doc.text(company?.name || '—', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor('#666666');
    let billY = y + 4;
    if (company?.address) { doc.text(company.address, margin, billY); billY += 3.5; }
    if (company?.city) { doc.text(`${company.city}${company.postcode ? ', ' + company.postcode : ''}`, margin, billY); billY += 3.5; }
    if (contact) {
        const contactName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
        if (contactName) { doc.text(`Attn: ${contactName}`, margin, billY); billY += 3.5; }
    }

    // Dates — right
    doc.setFontSize(9);
    let dateY = y;
    setColor('#999999');
    doc.setFont('helvetica', 'normal');
    doc.text('Issued:', pageWidth - margin - 50, dateY);
    setColor('#1a1a1a');
    doc.text(fmtDate(invoice.dateIssued), pageWidth - margin, dateY, { align: 'right' });
    dateY += 5;
    setColor('#999999');
    doc.text('Due:', pageWidth - margin - 50, dateY);
    setColor('#1a1a1a');
    doc.text(fmtDate(invoice.dateDue), pageWidth - margin, dateY, { align: 'right' });

    y = Math.max(billY, dateY) + 10;

    // ─── Line Items Table ───
    const colX = {
        desc: margin,
        qty: pageWidth - margin - 70,
        price: pageWidth - margin - 40 - 3,
        total: pageWidth - margin - 3,
    };

    // Table header
    setFillColor(accent);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Description', colX.desc + 3, y + 5.5);
    doc.text('Qty', colX.qty, y + 5.5, { align: 'center' });
    doc.text('Price', colX.price, y + 5.5, { align: 'right' });
    doc.text('Total', colX.total, y + 5.5, { align: 'right' });
    y += 8;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let grandTotal = 0;

    if (lineItems.length > 0) {
        lineItems.forEach((li, i) => {
            const lineTotal = (li.quantity || 1) * (li.unitPrice || 0);
            grandTotal += lineTotal;

            if (i % 2 === 0) {
                setFillColor('#f8f9fa');
                doc.rect(margin, y, contentWidth, 7, 'F');
            }

            setColor('#1a1a1a');
            doc.text(li.description || '', colX.desc + 3, y + 5);
            doc.text(String(li.quantity || 1), colX.qty, y + 5, { align: 'center' });
            doc.text(fmtCurrency(li.unitPrice || 0), colX.price, y + 5, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            doc.text(fmtCurrency(lineTotal), colX.total, y + 5, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            y += 7;
        });
    } else {
        // Single-line fallback for invoices without line items
        grandTotal = invoice.amount || 0;
        setColor('#1a1a1a');
        doc.text(invoice.description || 'Services', colX.desc + 3, y + 5);
        doc.text('1', colX.qty, y + 5, { align: 'center' });
        doc.text(fmtCurrency(grandTotal), colX.price, y + 5, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(fmtCurrency(grandTotal), colX.total, y + 5, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 7;
    }

    // Bottom line
    setColor('#eeeeee');
    setDrawColor('#eeeeee');
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Total box
    const totalBoxWidth = 60;
    const totalBoxX = pageWidth - margin - totalBoxWidth;
    setFillColor(`${accent}15`);
    // Use a light tinted background
    doc.setFillColor(240, 240, 255);
    doc.roundedRect(totalBoxX, y, totalBoxWidth, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setColor(accent);
    doc.text('Total', totalBoxX + 4, y + 8);
    doc.text(fmtCurrency(grandTotal), pageWidth - margin - 4, y + 8, { align: 'right' });
    y += 20;

    // ─── Payment Terms + Bank Details ───
    if (template.paymentTerms || template.bankDetails) {
        setColor('#eeeeee');
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;

        if (template.paymentTerms) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            setColor('#999999');
            doc.text('PAYMENT TERMS', margin, y);
            y += 3.5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            setColor('#444444');
            const ptLines = doc.splitTextToSize(template.paymentTerms, contentWidth);
            doc.text(ptLines, margin, y);
            y += ptLines.length * 3.5 + 4;
        }

        if (template.bankDetails) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            setColor('#999999');
            doc.text('BANK DETAILS', margin, y);
            y += 3.5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            setColor('#444444');
            const bdLines = doc.splitTextToSize(template.bankDetails, contentWidth);
            doc.text(bdLines, margin, y);
            y += bdLines.length * 3.5 + 4;
        }
    }

    // ─── Footer ───
    if (template.footerText) {
        const footerY = doc.internal.pageSize.getHeight() - 15;
        setColor('#eeeeee');
        doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        setColor('#999999');
        doc.text(template.footerText, pageWidth / 2, footerY, { align: 'center' });
    }

    // ─── Output ───
    const filename = `${invoice.invoiceNumber || 'Invoice'}.pdf`;
    const blob = doc.output('blob');
    const base64 = doc.output('datauristring').split(',')[1]; // raw base64

    return { blob, base64, filename, doc };
}
