// @ts-ignore
const { jsPDF } = window.jspdf;

export function generatePdf(content: string) {
    const doc = new jsPDF();
    
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - 2 * margin;
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    
    let y = margin;

    const lines = content.split('\n');

    lines.forEach(line => {
        if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
        
        const textLines = doc.splitTextToSize(line, usableWidth);
        
        doc.text(textLines, margin, y);
        y += textLines.length * 7; // Approximate line height
    });

    doc.save('revised-resume.pdf');
}
