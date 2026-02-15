import React from 'react';
import { ForensicCase, NodeResult } from '../types';
import { FileText, Download, Share2, Shield, BrainCircuit, Play } from 'lucide-react';
import { jsPDF } from "jspdf";

interface ReportViewProps {
  caseData: ForensicCase;
}

const ReportView: React.FC<ReportViewProps> = ({ caseData }) => {
  if (!caseData.executiveSummary) return null;

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // --- HELPER FUNCTIONS ---
    const checkPageBreak = (spaceNeeded: number) => {
      if (y + spaceNeeded > 280) {
        doc.addPage();
        y = 20;
      }
    };

    const addHeading = (text: string) => {
      checkPageBreak(15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(text, margin, y);
      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
    };

    const addText = (text: string, fontSize = 10, font = "times", style = "normal", color = [60, 60, 60]) => {
        doc.setFont(font, style);
        doc.setFontSize(fontSize);
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(text || "N/A", contentWidth);
        checkPageBreak(lines.length * 5);
        doc.text(lines, margin, y);
        y += (lines.length * 5) + 5;
    };

    // --- PDF CONTENT ---

    // 1. Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("KSHURA FORENSIC REPORT", pageWidth / 2, y, { align: "center" });
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont("courier", "normal");
    doc.setTextColor(100);
    doc.text(`GENERATED: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: "center" });
    y += 20;

    // 2. Case Info Box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, contentWidth, 35, 3, 3, "F");
    y += 10;
    
    doc.setFont("courier", "bold");
    doc.setTextColor(0);
    doc.text(`CASE ID: ${caseData.caseId}`, margin + 5, y);
    doc.text(`MODE:    ${caseData.mode.toUpperCase()}`, margin + 110, y);
    y += 8;
    doc.text(`HASH:    ${caseData.fileHash.substring(0, 24)}...`, margin + 5, y);
    doc.text(`DEVICE:  ${caseData.metadata?.cameraModel || 'Unknown'}`, margin + 110, y);
    y += 8;
    const score = caseData.finalScore || 0;
    doc.text(`SCORE:   ${score.toFixed(1)}/100`, margin + 5, y);
    y += 15;

    // 3. Executive Summary
    addHeading("EXECUTIVE SUMMARY");
    addText(caseData.executiveSummary || "", 11, "times", "normal", [0, 0, 0]);
    y += 5;

    // 4. Detailed Technical Findings
    addHeading("TECHNICAL FINDINGS LOG");

    (Object.values(caseData.nodes) as NodeResult<any>[]).forEach(node => {
        if (node.status !== 'completed') return;

        checkPageBreak(30);
        
        // Node Title Bar
        const riskColor = node.riskLevel === 'CRITICAL' ? [255, 230, 230] : node.riskLevel === 'HIGH' ? [255, 240, 230] : [240, 255, 240];
        doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
        doc.rect(margin, y, contentWidth, 8, "F");
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`${node.name.toUpperCase()}`, margin + 2, y + 5.5);
        
        const riskTextColor = node.riskLevel === 'CRITICAL' ? [200, 0, 0] : [0, 100, 0];
        doc.setTextColor(riskTextColor[0], riskTextColor[1], riskTextColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text(`RISK: ${node.riskLevel}`, margin + 130, y + 5.5);
        
        y += 12;

        // Node Inference
        addText(`Findings: ${node.inference}`, 10, "courier", "normal", [50, 50, 50]);
        y += 2;
    });

    // 5. Supervisor Chain of Thought (TRACE)
    doc.addPage();
    y = 20;
    addHeading("SUPERVISOR AGENT: CHAIN OF THOUGHT");
    
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);

    // Loop through analysisTrace
    if (caseData.analysisTrace && caseData.analysisTrace.length > 0) {
       caseData.analysisTrace.forEach((step, index) => {
           checkPageBreak(30);
           
           doc.setFont("courier", "bold");
           doc.setTextColor(50, 50, 50);
           doc.text(`[STEP ${index + 1}] ${step.timestamp} - ${step.type}`, margin, y);
           y += 5;

           doc.setFont("courier", "normal");
           doc.setTextColor(80, 80, 80);
           doc.text(`Action: ${step.title}`, margin + 5, y);
           y += 5;
           
           const detailLines = doc.splitTextToSize(step.detail, contentWidth - 5);
           doc.text(detailLines, margin + 5, y);
           y += (detailLines.length * 4) + 6;
       });
    } else {
       addText("No trace data available.", 10, "courier", "italic", [100, 100, 100]);
    }

    // Agent Synthesis Logic (The text explanation)
    y += 10;
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.text("FINAL SYNTHESIS LOGIC", margin, y);
    y += 8;
    addText(caseData.agentReasoning || "Log data unavailable.", 9, "courier", "normal", [80, 80, 80]);


    // Footer numbering
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Kshura Forensic Agent - Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: "center" });
    }

    doc.save(`Kshura_Report_${caseData.caseId}.pdf`);
  };

  return (
    <div className="mt-8 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-2xl animate-in fade-in duration-700">
      <div className="bg-slate-800 px-6 py-4 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center gap-3">
          <FileText className="text-cyan-400 w-5 h-5" />
          <h2 className="text-lg font-bold text-slate-100">Final Forensic Report</h2>
        </div>
        <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded flex items-center gap-2 transition-colors">
                <Share2 className="w-3 h-3" /> Share
            </button>
            <button 
                onClick={handleDownloadPDF}
                className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded flex items-center gap-2 transition-colors font-medium active:scale-95 transform"
            >
                <Download className="w-3 h-3" /> Export PDF
            </button>
        </div>
      </div>

      <div className="p-8 font-serif text-slate-300 space-y-8 max-w-4xl mx-auto bg-slate-950/30">
        {/* Header Section */}
        <div className="border-b border-slate-700 pb-6 flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2 font-sans">Verification Certificate</h1>
                <p className="text-slate-500 font-mono text-sm">CASE ID: {caseData.caseId}</p>
                <p className="text-slate-500 font-mono text-sm">HASH: {caseData.fileHash.substring(0, 24)}...</p>
            </div>
            <div className="text-right">
                <div className={`text-4xl font-bold ${caseData.finalScore && caseData.finalScore > 80 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {caseData.finalScore?.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-400 uppercase tracking-widest">Trust Score</div>
            </div>
        </div>

        {/* Executive Summary */}
        <section>
            <h3 className="text-cyan-400 text-sm font-bold uppercase tracking-wider mb-3 font-sans">Executive Summary</h3>
            <p className="leading-relaxed text-slate-300 text-lg">
                {caseData.executiveSummary}
            </p>
        </section>

        {/* Chain of Thought / Execution Trace */}
        <section className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
             <div className="bg-slate-950/50 px-6 py-3 border-b border-slate-800 flex items-center gap-2">
                 <BrainCircuit className="w-4 h-4 text-amber-400" />
                 <h3 className="text-amber-400 text-sm font-bold uppercase tracking-wider font-sans">
                     Supervisor Agent: Chain of Thought
                 </h3>
             </div>
             <div className="p-6 font-mono text-xs space-y-4">
                 {caseData.analysisTrace && caseData.analysisTrace.length > 0 ? (
                     caseData.analysisTrace.map((step, idx) => (
                         <div key={idx} className="flex gap-4 border-l-2 border-slate-800 pl-4 pb-1 relative">
                            {/* Timeline Dot */}
                            <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${step.type === 'PLAN' ? 'bg-cyan-500' : 'bg-emerald-500'}`}></div>
                            
                            <div className="w-16 flex-shrink-0 text-slate-500 text-[10px] pt-0.5">
                                {step.timestamp}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        step.type === 'PLAN' ? 'bg-cyan-900/30 text-cyan-400' : 'bg-emerald-900/30 text-emerald-400'
                                    }`}>
                                        {step.type}
                                    </span>
                                    <span className="text-slate-200 font-bold">{step.title}</span>
                                </div>
                                <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">{step.detail}</p>
                            </div>
                         </div>
                     ))
                 ) : (
                     <p className="text-slate-500 italic">No execution trace available.</p>
                 )}
                 
                 {/* Final Logic Block */}
                 <div className="mt-8 pt-4 border-t border-slate-800 border-dashed">
                     <p className="text-slate-500 mb-2 font-bold uppercase text-[10px]">Final Synthesis Logic:</p>
                     <p className="text-slate-400 leading-relaxed">
                        {caseData.agentReasoning}
                     </p>
                 </div>
             </div>
        </section>

        {/* Technical Footer */}
        <div className="pt-6 border-t border-slate-800 grid grid-cols-2 gap-4 text-xs font-mono text-slate-500">
            <div>
                <span className="block text-slate-600 uppercase mb-1">Generated By</span>
                Kshura AI Forensic Core v2.4.1
            </div>
            <div className="text-right">
                <span className="block text-slate-600 uppercase mb-1">Timestamp</span>
                {new Date().toUTCString()}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReportView;