import jsPDF from 'jspdf';

export async function generatePrescriptionPDF(diagnosis, patientName = 'Patient') {
    const doc = new jsPDF();
    const data = diagnosis?.data;
    if (!data) return null;

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    const textWidth = contentWidth - 20; // Text area with proper padding for word wrap
    let y = 20;

    // Colors
    const pistachio = [147, 197, 114];
    const pistachioLight = [238, 245, 233];
    const darkGray = [40, 40, 40];
    const mediumGray = [100, 100, 100];
    const lightGray = [180, 180, 180];

    // Helper to check page break
    const checkPage = (needed = 30) => {
        if (y + needed > 270) {
            doc.addPage();
            y = 20;
        }
    };

    // ========== HEADER ==========
    doc.setFillColor(...pistachio);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('MediCare AI', margin, 25);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('AI-Powered Health Assessment Report', margin, 34);

    y = 55;

    // ========== PATIENT INFO BOX ==========
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margin, y - 5, contentWidth, 28, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...mediumGray);
    doc.setFont('helvetica', 'normal');

    // Row 1
    doc.text('Patient:', margin + 8, y + 5);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text(patientName, margin + 35, y + 5);

    doc.setTextColor(...mediumGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Date:', margin + 110, y + 5);
    doc.setTextColor(...darkGray);
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), margin + 125, y + 5);

    // Row 2
    y += 12;
    doc.setTextColor(...mediumGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Report ID:', margin + 8, y + 5);
    doc.setTextColor(...darkGray);
    doc.text(`MCA-${Date.now().toString(36).toUpperCase()}`, margin + 38, y + 5);

    y += 25;

    // ========== ASSESSMENT LEVEL ==========
    const urgencyLevel = data.urgencyLevel || 'low';
    const urgencyColor = urgencyLevel === 'low' ? [90, 138, 61] :
        urgencyLevel === 'medium' ? [180, 130, 70] : [180, 70, 70];
    const urgencyBg = urgencyLevel === 'low' ? pistachioLight :
        urgencyLevel === 'medium' ? [254, 243, 226] : [254, 230, 230];

    // Calculate box height based on content
    let assessmentBoxHeight = 20;
    let assessmentLines = [];
    if (data.overallAssessment) {
        doc.setFontSize(9);
        assessmentLines = doc.splitTextToSize(data.overallAssessment, textWidth);
        assessmentBoxHeight = 20 + (assessmentLines.length * 4) + 8;
    }

    doc.setFillColor(...urgencyBg);
    doc.roundedRect(margin, y - 5, contentWidth, assessmentBoxHeight, 3, 3, 'F');

    doc.setFontSize(11);
    doc.setTextColor(...mediumGray);
    doc.setFont('helvetica', 'bold');
    doc.text('Assessment Level:', margin + 8, y + 6);

    doc.setTextColor(...urgencyColor);
    doc.setFontSize(14);
    doc.text(urgencyLevel.toUpperCase(), margin + 55, y + 6);

    if (data.overallAssessment) {
        doc.setFontSize(9);
        doc.setTextColor(...mediumGray);
        doc.setFont('helvetica', 'normal');
        doc.text(assessmentLines, margin + 8, y + 18);
    }

    y += assessmentBoxHeight + 10;

    // ========== POSSIBLE CONDITIONS ==========
    if (data.possibleConditions?.length > 0) {
        checkPage(50);

        doc.setFontSize(12);
        doc.setTextColor(...pistachio);
        doc.setFont('helvetica', 'bold');
        doc.text('POSSIBLE CONDITIONS', margin, y);

        doc.setDrawColor(...lightGray);
        doc.line(margin, y + 3, pageWidth - margin, y + 3);
        y += 12;

        data.possibleConditions.forEach((cond, i) => {
            checkPage(35);

            // Condition name with wrapping
            doc.setFontSize(11);
            doc.setTextColor(...darkGray);
            doc.setFont('helvetica', 'bold');
            const condName = `${i + 1}. ${cond.name}`;
            const nameLines = doc.splitTextToSize(condName, textWidth);
            doc.text(nameLines, margin + 4, y);
            y += nameLines.length * 5;

            // Probability on new line
            if (cond.probability) {
                doc.setFontSize(9);
                doc.setTextColor(...mediumGray);
                doc.setFont('helvetica', 'italic');
                doc.text(`(${cond.probability} probability)`, margin + 8, y);
                y += 5;
            }

            // Description
            if (cond.description) {
                doc.setFontSize(9);
                doc.setTextColor(...mediumGray);
                doc.setFont('helvetica', 'normal');
                const descLines = doc.splitTextToSize(cond.description, textWidth);
                doc.text(descLines, margin + 8, y);
                y += descLines.length * 4 + 4;
            }
            y += 4;
        });
        y += 5;
    }

    // ========== SUGGESTED MEDICINES ==========
    if (data.suggestedMedicines?.length > 0) {
        checkPage(60);

        doc.setFontSize(12);
        doc.setTextColor(...pistachio);
        doc.setFont('helvetica', 'bold');
        doc.text('SUGGESTED MEDICINES', margin, y);

        doc.setDrawColor(...lightGray);
        doc.line(margin, y + 3, pageWidth - margin, y + 3);
        y += 12;

        data.suggestedMedicines.forEach((med) => {
            // Calculate box height based on warnings
            let warnLines = [];
            let boxHeight = 28;
            if (med.warnings) {
                doc.setFontSize(8);
                const warnText = `⚠ ${med.warnings}`;
                warnLines = doc.splitTextToSize(warnText, textWidth);
                boxHeight = 28 + (warnLines.length * 4) + 4;
            }

            checkPage(boxHeight + 10);

            // Medicine box with dynamic height
            doc.setFillColor(252, 252, 252);
            doc.setDrawColor(230, 230, 230);
            doc.roundedRect(margin, y - 4, contentWidth, boxHeight, 2, 2, 'FD');

            // Medicine name
            doc.setFontSize(11);
            doc.setTextColor(...darkGray);
            doc.setFont('helvetica', 'bold');
            doc.text(med.name, margin + 6, y + 4);

            // OTC/Prescription badge
            doc.setFontSize(8);
            doc.setTextColor(...(med.type === 'OTC' ? pistachio : [180, 130, 70]));
            doc.text(med.type || 'OTC', pageWidth - margin - 20, y + 4);

            // Details row 1
            let textY = y + 10;
            doc.setFontSize(9);
            doc.setTextColor(...mediumGray);
            doc.setFont('helvetica', 'normal');
            doc.text(`Dosage: ${med.dosage}`, margin + 6, textY + 3);
            doc.text(`Frequency: ${med.frequency}`, margin + 80, textY + 3);

            // Details row 2
            textY += 6;
            doc.text(`Duration: ${med.duration}`, margin + 6, textY + 3);

            // Warning
            if (med.warnings) {
                textY += 6;
                doc.setTextColor(180, 100, 70);
                doc.setFontSize(8);
                doc.text(warnLines, margin + 6, textY + 3);
            }

            y += boxHeight + 6;
        });
        y += 5;
    }

    // ========== HOME REMEDIES ==========
    if (data.homeRemedies?.length > 0) {
        checkPage(40);

        doc.setFontSize(12);
        doc.setTextColor(...pistachio);
        doc.setFont('helvetica', 'bold');
        doc.text('HOME REMEDIES', margin, y);

        doc.setDrawColor(...lightGray);
        doc.line(margin, y + 3, pageWidth - margin, y + 3);
        y += 12;

        data.homeRemedies.forEach((rem) => {
            checkPage(20);

            doc.setFontSize(10);
            doc.setTextColor(...darkGray);
            doc.setFont('helvetica', 'bold');
            doc.text(`• ${rem.remedy}`, margin + 4, y);
            y += 5;

            doc.setFontSize(9);
            doc.setTextColor(...mediumGray);
            doc.setFont('helvetica', 'normal');
            const instrLines = doc.splitTextToSize(rem.instructions, textWidth);
            doc.text(instrLines, margin + 10, y);
            y += instrLines.length * 4 + 6;
        });
        y += 5;
    }

    // ========== LIFESTYLE ==========
    if (data.lifestyle?.length > 0) {
        checkPage(40);

        doc.setFontSize(12);
        doc.setTextColor(...pistachio);
        doc.setFont('helvetica', 'bold');
        doc.text('LIFESTYLE RECOMMENDATIONS', margin, y);

        doc.setDrawColor(...lightGray);
        doc.line(margin, y + 3, pageWidth - margin, y + 3);
        y += 12;

        data.lifestyle.slice(0, 5).forEach((item, i) => {
            checkPage(15);

            doc.setFontSize(9);
            doc.setTextColor(...darkGray);
            doc.setFont('helvetica', 'normal');
            const itemLines = doc.splitTextToSize(`${i + 1}. ${item}`, textWidth);
            doc.text(itemLines, margin + 6, y);
            y += itemLines.length * 4 + 2;
        });
        y += 5;
    }

    // ========== WHEN TO SEE DOCTOR ==========
    if (data.whenToSeeDoctor) {
        // Calculate box height based on content
        doc.setFontSize(9);
        const doctorLines = doc.splitTextToSize(data.whenToSeeDoctor, textWidth);
        const doctorBoxHeight = 16 + (doctorLines.length * 4) + 8;

        checkPage(doctorBoxHeight + 10);

        doc.setFillColor(254, 243, 226);
        doc.roundedRect(margin, y - 4, contentWidth, doctorBoxHeight, 2, 2, 'F');

        doc.setFontSize(10);
        doc.setTextColor(180, 130, 70);
        doc.setFont('helvetica', 'bold');
        doc.text('⚠ WHEN TO SEEK MEDICAL ATTENTION', margin + 6, y + 4);

        doc.setFontSize(9);
        doc.setTextColor(100, 80, 60);
        doc.setFont('helvetica', 'normal');
        doc.text(doctorLines, margin + 6, y + 14);
        y += doctorBoxHeight + 5;
    }

    // ========== FOOTER ==========
    const footerY = 275;
    doc.setDrawColor(...lightGray);
    doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

    doc.setFontSize(7);
    doc.setTextColor(...lightGray);
    doc.setFont('helvetica', 'normal');
    const disclaimer = 'DISCLAIMER: This AI-generated report is for informational purposes only. It is not a medical diagnosis. Always consult a healthcare provider.';
    doc.text(disclaimer, margin, footerY - 3);

    doc.setFontSize(9);
    doc.setTextColor(...pistachio);
    doc.text('Generated by MediCare AI', pageWidth / 2, footerY + 5, { align: 'center' });

    return doc;
}

export function downloadPDF(doc, filename = 'MediCare_Prescription') {
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}
