import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

class ExportService {
  exportToExcel(data, filename) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  exportToPDF(data, filename, options = {}) {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(options.title || 'التقرير', 14, 15);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 14, 25);

    // Add table
    doc.autoTable({
      startY: 35,
      head: [options.headers || Object.keys(data[0])],
      body: data.map(item => Object.values(item)),
      theme: 'grid',
      styles: {
        font: 'Arial',
        fontSize: 10,
        cellPadding: 5,
        halign: 'right'
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: 'bold'
      }
    });

    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(
        `صفحة ${i} من ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`${filename}.pdf`);
  }

  exportToCSV(data, filename) {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(item => Object.values(item).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  }

  exportToJSON(data, filename) {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.json`;
    link.click();
  }

  // Export with custom formatting
  exportWithFormat(data, filename, format, options = {}) {
    switch (format.toLowerCase()) {
      case 'excel':
        this.exportToExcel(data, filename);
        break;
      case 'pdf':
        this.exportToPDF(data, filename, options);
        break;
      case 'csv':
        this.exportToCSV(data, filename);
        break;
      case 'json':
        this.exportToJSON(data, filename);
        break;
      default:
        throw new Error('صيغة غير مدعومة');
    }
  }
}

export const exportService = new ExportService(); 