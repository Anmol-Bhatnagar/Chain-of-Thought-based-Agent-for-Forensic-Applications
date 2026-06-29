import React, { useState, useEffect, useRef } from 'react';
import { ForensicCase, AuditLogEntry, NodeResult, InvestigationMode, AnalysisStep } from './types';
import AuditLog from './components/AuditLog';
import NodeCard from './components/NodeCard';
import ReportView from './components/ReportView';
import MapPreview from './components/MapPreview';
import NavBar from './components/NavBar';
import {
  Scan, Camera, Fingerprint, Layers, Sun, Copy, Hash, MapPin,
  UploadCloud, PlayCircle, Terminal, AlertOctagon, FileInput, Search, BrainCircuit,
  Filter, X, Shield, ShoppingBag, Briefcase, Binary, ScanEye, Database, Settings as SettingsIcon, CheckCircle2, RotateCcw, Sliders, Save,
  Trash2, Download, Upload
} from 'lucide-react';
import {
  extractMetadata, startGlobalAnalysis,
  runDeepfakeNode, runDCTNode, runPRNUNode, runELANode,
  runLightingNode, runCloneNode, runNoiseNode, runStringsNode, runRegionQualityNode,
  generateHash, delay, GlobalAnalysisContext
} from './services/forensicSimulator';
import { generateForensicReport, getNextInvestigationStep } from './services/geminiService';


const DEFAULT_WEIGHTS = {
  deepfake: 0.2,
  region_quality: 0.2,
  dct: 0.1,
  prnu: 0.1,
  clone: 0.1,
  ela: 0.1,
  noise: 0.1,
  lighting: 0.05,
  strings: 0.05,
};

const DEFAULT_MODE_WEIGHTS: Record<InvestigationMode, Record<string, number>> = {
  general: {
    deepfake: 0.2,
    region_quality: 0.2,
    dct: 0.1,
    prnu: 0.1,
    clone: 0.1,
    ela: 0.1,
    noise: 0.1,
    lighting: 0.05,
    strings: 0.05,
  },
  insurance: {
    deepfake: 0.1,
    region_quality: 0.25,
    dct: 0.1,
    prnu: 0.05,
    clone: 0.15,
    ela: 0.1,
    noise: 0.1,
    lighting: 0.1,
    strings: 0.05,
  },
  customer_care: {
    deepfake: 0.1,
    region_quality: 0.25,
    dct: 0.1,
    prnu: 0.05,
    clone: 0.15,
    ela: 0.1,
    noise: 0.1,
    lighting: 0.05,
    strings: 0.1,
  }
};


const initialCaseState: ForensicCase = {
  caseId: '',
  mode: 'general',
  fileHash: '',
  acquisitionTime: '',
  metadata: null,
  nodes: {
    deepfake: { id: 'n1', name: 'Deepfake Detector', status: 'idle', data: null, riskLevel: 'LOW', score: 0, inference: '' },
    dct: { id: 'n2', name: 'DCT Analysis', status: 'idle', data: null, riskLevel: 'LOW', score: 0, inference: '' },
    prnu: { id: 'n3', name: 'PRNU Sensor Match', status: 'idle', data: null, riskLevel: 'LOW', score: 0, inference: '' },
    ela: { id: 'n4', name: 'Error Level (ELA)', status: 'idle', data: null, riskLevel: 'LOW', score: 0, inference: '' },
    lighting: { id: 'n5', name: 'Scene Lighting', status: 'idle', data: null, riskLevel: 'LOW', score: 0, inference: '' },
    clone: { id: 'n6', name: 'Clone Detection', status: 'idle', data: null, riskLevel: 'LOW', score: 0, inference: '' },
    noise: { id: 'n7', name: 'Noise Distribution', status: 'idle', data: null, riskLevel: 'LOW', score: 0, inference: '' },
    strings: { id: 'n8', name: 'String Extraction', status: 'idle', data: null, riskLevel: 'LOW', score: 0, inference: '' },
    region_quality: { id: 'n9', name: 'Region Integrity', status: 'idle', data: null, riskLevel: 'LOW', score: 0, inference: '' },
  },
  finalScore: null,
  finalVerdict: null,
  agentReasoning: null,
  executiveSummary: null,
  auditLog: [],
  analysisTrace: [],
  currentStep: 'Waiting for Upload'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [caseData, setCaseData] = useState<ForensicCase>(initialCaseState);


  const [history, setHistory] = useState<Record<InvestigationMode, ForensicCase[]>>(() => {
    try {
      const saved = localStorage.getItem('kshura_forensics_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          general: parsed.general || [],
          insurance: parsed.insurance || [],
          customer_care: parsed.customer_care || []
        };
      }
    } catch (e) {
      console.error('Failed to load history from localStorage:', e);
    }
    return {
      general: [],
      insurance: [],
      customer_care: []
    };
  });


  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [filterCamera, setFilterCamera] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });


  const [selectedMode, setSelectedMode] = useState<InvestigationMode>(() => {
    try {
      const saved = localStorage.getItem('kshura_forensics_selected_mode');
      if (saved && (saved === 'general' || saved === 'insurance' || saved === 'customer_care')) {
        return saved as InvestigationMode;
      }
    } catch (e) {
      console.error(e);
    }
    return 'general';
  });

  const [modeWeights, setModeWeights] = useState<Record<InvestigationMode, Record<string, number>>>(() => {
    try {
      const saved = localStorage.getItem('kshura_forensics_mode_weights');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          general: parsed.general || DEFAULT_MODE_WEIGHTS.general,
          insurance: parsed.insurance || DEFAULT_MODE_WEIGHTS.insurance,
          customer_care: parsed.customer_care || DEFAULT_MODE_WEIGHTS.customer_care,
        };
      }
    } catch (e) {
      console.error('Failed to load mode weights from localStorage:', e);
    }
    return DEFAULT_MODE_WEIGHTS;
  });

  const scoringWeights = modeWeights[selectedMode];

  const [pendingMode, setPendingMode] = useState<InvestigationMode>(selectedMode);
  const [pendingWeights, setPendingWeights] = useState(modeWeights[selectedMode]);


  const [auditLogWidth, setAuditLogWidth] = useState(320);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);


  const [isSavingSettings, setIsSavingSettings] = useState(false);



  const activeRunIdRef = useRef<string | null>(null);


  useEffect(() => {
    if (activeTab === 'settings') {
      setPendingMode(selectedMode);
      setPendingWeights(modeWeights[selectedMode]);
    }
  }, [activeTab, selectedMode, modeWeights]);

  useEffect(() => {
    setPendingWeights(modeWeights[pendingMode]);
  }, [pendingMode, modeWeights]);

  useEffect(() => {
    try {
      localStorage.setItem('kshura_forensics_history', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history to localStorage:', e);
    }
  }, [history]);


  const currentModeHistory = history[selectedMode];
  const filteredHistory = currentModeHistory.filter(c => {

    const matchesText =
      c.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.fileHash.toLowerCase().includes(searchQuery.toLowerCase());


    let matchesRisk = true;
    if (filterRisk !== 'ALL') {

        let calculatedRisk = 'LOW';
        if (c.finalScore !== null) {
            if (c.finalScore < 40) calculatedRisk = 'CRITICAL';
            else if (c.finalScore < 60) calculatedRisk = 'HIGH';
            else if (c.finalScore < 80) calculatedRisk = 'MEDIUM';
        }
        matchesRisk = calculatedRisk === filterRisk;
    }


    let matchesCamera = true;
    if (filterCamera) {
        matchesCamera = c.metadata?.cameraModel?.toLowerCase().includes(filterCamera.toLowerCase()) || false;
    }


    let matchesDate = true;
    if (dateRange.start) {
        matchesDate = matchesDate && new Date(c.acquisitionTime) >= new Date(dateRange.start);
    }
    if (dateRange.end) {
        matchesDate = matchesDate && new Date(c.acquisitionTime) <= new Date(dateRange.end);
    }

    return matchesText && matchesRisk && matchesCamera && matchesDate;
  });


  const addLog = (action: string, details: string, status: AuditLogEntry['status'] = 'info') => {


    const newLog: AuditLogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString().split('T')[1].split('.')[0],
      action,
      details,
      status
    };
    setCaseData(prev => ({
      ...prev,
      auditLog: [...prev.auditLog, newLog]
    }));
  };


  const loadCase = (c: ForensicCase) => {
    if (isProcessing) return;
    setCaseData(c);
    setActiveTab('home');
  };

  const deleteCase = (mode: InvestigationMode, caseId: string) => {
    if (window.confirm("Are you sure you want to delete this case from history?")) {
      setHistory(prev => ({
        ...prev,
        [mode]: prev[mode].filter(c => c.caseId !== caseId)
      }));
    }
  };

  const clearHistory = (mode: InvestigationMode) => {
    if (window.confirm(`Are you sure you want to clear all history for the ${mode.replace('_', ' ')} investigation mode?`)) {
      setHistory(prev => ({
        ...prev,
        [mode]: []
      }));
    }
  };

  const downloadJSON = (data: any, filename: string) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download JSON:', e);
      alert('Failed to export JSON file.');
    }
  };

  const exportHistoryToJSON = (mode: InvestigationMode) => {
    const data = history[mode];
    if (data.length === 0) {
      alert("No history entries to export for this mode.");
      return;
    }
    const filename = `kshura_forensics_history_${mode}_${new Date().toISOString().slice(0, 10)}.json`;
    downloadJSON(data, filename);
  };

  const exportCaseToJSON = (c: ForensicCase) => {
    const filename = `kshura_forensic_case_${c.caseId}.json`;
    downloadJSON(c, filename);
  };

  const exportHistoryToCSV = (mode: InvestigationMode) => {
    const data = history[mode];
    if (data.length === 0) {
      alert("No history entries to export for this mode.");
      return;
    }

    try {
      const headers = ['Case ID', 'File Name', 'SHA-256 Hash', 'Mode', 'Acquisition Time', 'Score', 'Risk Level', 'Camera Model', 'Software', 'Verdict'];
      
      const rows = data.map(c => {
        let riskLevel = 'LOW';
        if (c.finalScore !== null) {
          if (c.finalScore < 40) riskLevel = 'CRITICAL';
          else if (c.finalScore < 60) riskLevel = 'HIGH';
          else if (c.finalScore < 80) riskLevel = 'MEDIUM';
        }

        const escapeCSV = (val: any) => {
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        return [
          escapeCSV(c.caseId),
          escapeCSV(c.fileName),
          escapeCSV(c.fileHash),
          escapeCSV(c.mode),
          escapeCSV(c.acquisitionTime),
          escapeCSV(c.finalScore ?? 'N/A'),
          escapeCSV(riskLevel),
          escapeCSV(c.metadata?.cameraModel ?? 'N/A'),
          escapeCSV(c.metadata?.software ?? 'N/A'),
          escapeCSV(c.finalVerdict ?? 'N/A')
        ];
      });

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      const filename = `kshura_forensics_history_${mode}_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export CSV:', e);
      alert('Failed to export CSV file.');
    }
  };

  const importHistoryFromJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const importedData = JSON.parse(text);
        
        const casesToProcess: ForensicCase[] = Array.isArray(importedData)
          ? importedData
          : [importedData];

        if (casesToProcess.length === 0) {
          alert("Imported file is empty or invalid.");
          return;
        }

        const validCases = casesToProcess.filter(c => {
          return c && typeof c === 'object' && c.caseId && c.fileName && c.fileHash && c.mode;
        });

        if (validCases.length === 0) {
          alert("No valid case records found in the JSON file. Ensure the file contains valid Kshura Forensics case exports.");
          return;
        }

        setHistory(prev => {
          const updated = { ...prev };
          let addedCount = 0;
          let duplicateCount = 0;

          validCases.forEach(c => {
            const mode = c.mode as InvestigationMode;
            if (!updated[mode]) {
              updated[mode] = [];
            }

            const exists = updated[mode].some(existing => existing.caseId === c.caseId);
            if (!exists) {
              updated[mode] = [c, ...updated[mode]];
              addedCount++;
            } else {
              duplicateCount++;
            }
          });

          alert(`Import completed successfully!\nImported: ${addedCount} case(s).\nSkipped duplicates: ${duplicateCount} case(s).`);
          return updated;
        });

      } catch (err) {
        console.error('Failed to parse import JSON:', err);
        alert('Invalid JSON file. Please make sure you are uploading a valid export file.');
      }
    };
    reader.readAsText(file);
  };


  const handleNewCase = () => {
    if (isProcessing) {
        const confirmNew = window.confirm("Investigation in progress. Starting a new case will discard all current data.\n\nDo you want to continue?");
        if (confirmNew) {

            activeRunIdRef.current = null;
            setIsProcessing(false);


            setCaseData({...initialCaseState, mode: selectedMode});
            setActiveTab('home');
        }
    } else {

        setCaseData({...initialCaseState, mode: selectedMode});
        setActiveTab('home');
    }
  };


  const handleSaveSettings = () => {
      const modeChanged = pendingMode !== selectedMode;
      const weightsChanged = JSON.stringify(pendingWeights) !== JSON.stringify(modeWeights[pendingMode]);

      if (!modeChanged && !weightsChanged) return;


      if (modeChanged) {
        const formattedMode = pendingMode.replace('_', ' ').toUpperCase();
        const hasActiveData = caseData.caseId !== '' || isProcessing;

        if (hasActiveData) {
            const confirm = window.confirm(
                `Switch Forensic Mode to ${formattedMode}?\n\nChanging the mode will reset the current investigation and clear all data. Do you want to proceed?`
            );
            if (!confirm) return;
        }
      }

      setIsSavingSettings(true);


      setTimeout(() => {
          if (weightsChanged) {
              setModeWeights(prev => {
                  const updated = {
                      ...prev,
                      [pendingMode]: pendingWeights
                  };
                  try {
                      localStorage.setItem('kshura_forensics_mode_weights', JSON.stringify(updated));
                  } catch (e) {
                      console.error('Failed to save mode weights:', e);
                  }
                  return updated;
              });
          }

          if (modeChanged) {
               if (isProcessing) {
                  activeRunIdRef.current = null;
                  setIsProcessing(false);
               }

               setSelectedMode(pendingMode);
               try {
                   localStorage.setItem('kshura_forensics_selected_mode', pendingMode);
               } catch (e) {
                   console.error('Failed to save selected mode:', e);
               }

               setCaseData({
                   ...initialCaseState,
                   mode: pendingMode
               });
          }

          setIsSavingSettings(false);
      }, 800);
  };

  const handleResetAllSettings = () => {
    if (window.confirm("Are you sure you want to reset all forensic modes to their default scoring weights?")) {
      setModeWeights(DEFAULT_MODE_WEIGHTS);
      setPendingWeights(DEFAULT_MODE_WEIGHTS[pendingMode]);
      try {
        localStorage.setItem('kshura_forensics_mode_weights', JSON.stringify(DEFAULT_MODE_WEIGHTS));
      } catch (e) {
        console.error('Failed to save default mode weights:', e);
      }
      alert("All scoring weights have been reset to factory defaults.");
    }
  };


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith('image/')) {
        addLog('UPLOAD ERROR', 'Invalid file type. Please upload an image.', 'error');
        return;
      }
      startInvestigation(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      startInvestigation(e.target.files[0]);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };


  const startInvestigation = async (file: File) => {
    if (isProcessing) return;


    const runId = Math.random().toString(36).substr(2, 9);
    activeRunIdRef.current = runId;

    setIsProcessing(true);


    const newId = `CASE-${Math.floor(Math.random() * 100000)}`;
    const initialState = { ...initialCaseState, caseId: newId, mode: selectedMode };
    setCaseData(initialState);


    let currentCaseState = { ...initialState };


    const updateState = (updates: Partial<ForensicCase>) => {
      if (activeRunIdRef.current !== runId) return;
      currentCaseState = { ...currentCaseState, ...updates };
      setCaseData(prev => ({ ...prev, ...updates }));
    };

    const updateNodeState = (key: keyof ForensicCase['nodes'], updates: Partial<NodeResult<any>>) => {
       if (activeRunIdRef.current !== runId) return;
       const newNodes = {
         ...currentCaseState.nodes,
         [key]: { ...currentCaseState.nodes[key], ...updates }
       };
       currentCaseState = { ...currentCaseState, nodes: newNodes };
       setCaseData(prev => ({
         ...prev,
         nodes: {
           ...prev.nodes,
           [key]: { ...prev.nodes[key], ...updates }
         }
       }));
    };

    const addTraceStep = (type: AnalysisStep['type'], title: string, detail: string, risk?: string) => {
        if (activeRunIdRef.current !== runId) return;
        const step: AnalysisStep = {
            id: Math.random().toString(36).substr(2, 9),
            order: currentCaseState.analysisTrace.length + 1,
            timestamp: new Date().toLocaleTimeString(),
            type,
            title,
            detail,
            risk
        };
        const newTrace = [...currentCaseState.analysisTrace, step];
        currentCaseState = { ...currentCaseState, analysisTrace: newTrace };
        setCaseData(prev => ({ ...prev, analysisTrace: newTrace }));
    };


    if (activeRunIdRef.current !== runId) return;
    addLog('INITIALIZATION', `Created Case ID: ${newId} (Mode: ${selectedMode.toUpperCase()})`, 'info');
    addTraceStep('PLAN', 'Investigation Initialized', `Mode: ${selectedMode}. File received: ${file.name}`);
    addLog('UPLOAD', `Received file: ${file.name} (${(file.size/1024).toFixed(1)} KB)`, 'info');

    await delay(300);
    if (activeRunIdRef.current !== runId) return;

    const hash = await generateHash(file);
    const time = new Date().toISOString();
    updateState({ fileHash: hash, acquisitionTime: time });
    addLog('CHAIN OF CUSTODY', `Generated SHA-256: ${hash.substring(0, 16)}...`, 'success');


    if (activeRunIdRef.current !== runId) return;
    addLog('METADATA EXTRACTION', 'Parsing EXIF and GPS data...', 'info');
    const meta = await extractMetadata(file);
    updateState({ metadata: meta });
    addTraceStep('FINDING', 'Metadata Extracted', `Camera: ${meta.cameraModel || 'N/A'}, Software: ${meta.software || 'N/A'}`);
    addLog('METADATA FOUND', `Device: ${meta.cameraModel}, Soft: ${meta.software}`, meta.software?.toLowerCase().includes('adobe') ? 'warning' : 'success');


    if (activeRunIdRef.current !== runId) return;
    addLog('AGENT EXECUTION', 'Dispatching image to Gemini Vision & Signal Processors...', 'info');
    updateState({ currentStep: 'Processing Visual & Signal Data...' });

    let analysisContext: GlobalAnalysisContext;
    try {

       analysisContext = await startGlobalAnalysis(file, selectedMode);
    } catch (e) {
       console.error(e);
       addLog('ANALYSIS ERROR', 'Failed to process image data.', 'error');
       setIsProcessing(false);
       return;
    }

    if (activeRunIdRef.current !== runId) return;

    addLog('DATA ACQUIRED', 'Raw analysis data received. Beginning Agent Planner loop...', 'success');


    const nodeRunners: Record<string, (ctx: GlobalAnalysisContext) => Promise<Partial<NodeResult<any>>>> = {
      deepfake: runDeepfakeNode,
      dct: runDCTNode,
      prnu: runPRNUNode,
      ela: runELANode,
      lighting: runLightingNode,
      clone: runCloneNode,
      noise: runNoiseNode,
      strings: runStringsNode,
      region_quality: runRegionQualityNode
    };

    const completedNodeKeys = new Set<string>();
    const maxIterations = 9;
    let iterations = 0;

    while (iterations < maxIterations) {
       if (activeRunIdRef.current !== runId) return;

       const availableKeys = Object.keys(currentCaseState.nodes).filter(k => !completedNodeKeys.has(k));

       if (availableKeys.length === 0) break;


       const completedSummary = Array.from(completedNodeKeys).map(k => ({
         id: k,
         name: currentCaseState.nodes[k as keyof typeof currentCaseState.nodes].name,
         risk: currentCaseState.nodes[k as keyof typeof currentCaseState.nodes].riskLevel,
         findings: currentCaseState.nodes[k as keyof typeof currentCaseState.nodes].inference
       }));


       updateState({ currentStep: 'Agent Deciding Next Step...' });

       let plan;
       try {

         plan = await getNextInvestigationStep(meta, completedSummary, availableKeys, selectedMode);
       } catch (err) {
         plan = { nextNode: availableKeys[0] || 'FINISH', reasoning: "Planner error, proceeding sequentially." };
       }

       if (activeRunIdRef.current !== runId) return;

       if (plan.nextNode === 'FINISH') {
         if (availableKeys.length > 0) {
            addTraceStep('PLAN', 'Supervisor Decision: Conclude Investigation', `Reason: ${plan.reasoning}`);
            addLog('PLANNER', `Agent Decision: CONCLUDE EARLY. Skipped ${availableKeys.length} nodes. Reason: ${plan.reasoning}`, 'success');
         } else {
            addTraceStep('PLAN', 'Supervisor Decision: Investigation Complete', `Reason: ${plan.reasoning}`);
            addLog('PLANNER', `Agent Decision: INVESTIGATION COMPLETE. ${plan.reasoning}`, 'success');
         }
         break;
       }

       if (!availableKeys.includes(plan.nextNode)) {
         addLog('PLANNER WARNING', `Agent requested invalid node '${plan.nextNode}'. Stopping loop.`, 'warning');
         break;
       }


       const nodeKey = plan.nextNode;
       const nodeName = currentCaseState.nodes[nodeKey as keyof typeof currentCaseState.nodes].name;

       addTraceStep('PLAN', `Supervisor Decision: Run ${nodeName}`, `Reason: ${plan.reasoning}`);
       addLog('PLANNER', `Next: ${nodeName} - ${plan.reasoning}`, 'info');
       
       updateNodeState(nodeKey as any, { status: 'processing' });
       updateState({ currentStep: `Running ${nodeName}...` });

       const result = await nodeRunners[nodeKey](analysisContext);

       if (activeRunIdRef.current !== runId) return;

       updateNodeState(nodeKey as any, { ...result, status: 'completed' });

       const isHighRisk = result.riskLevel === 'HIGH' || result.riskLevel === 'CRITICAL';
       addTraceStep('FINDING', `${nodeName} Results`, `Risk: ${result.riskLevel}. Inference: ${result.inference}`, result.riskLevel);
       addLog('NODE FINISHED', `Risk Level: ${result.riskLevel}`, isHighRisk ? 'warning' : 'success');

       completedNodeKeys.add(nodeKey);
       iterations++;
       await delay(800);
    }


    if (activeRunIdRef.current !== runId) return;
    updateState({ currentStep: 'Calculating Weighted Confidence Scores...' });


    let totalScore = 0;
    let totalWeight = 0;
    const activeWeights = modeWeights[currentCaseState.mode] || DEFAULT_MODE_WEIGHTS[currentCaseState.mode];

    (Object.keys(currentCaseState.nodes) as Array<keyof typeof currentCaseState.nodes>).forEach(key => {
        if (completedNodeKeys.has(key)) {
            const n = currentCaseState.nodes[key];
            const weight = activeWeights[key] || 0.05;
            totalScore += (n.score || 0) * weight;
            totalWeight += weight;
        }
    });

    const finalScore = totalWeight > 0 ? (totalScore / totalWeight) : 0;

    const weightLogDetails = (Object.keys(currentCaseState.nodes) as Array<keyof typeof currentCaseState.nodes>)
      .filter(key => completedNodeKeys.has(key))
      .map(key => `${key}: ${(activeWeights[key] || 0.05).toFixed(2)}`)
      .join(', ');
    addLog('SCORING', `Applied scoring weights for ${currentCaseState.mode} mode: { ${weightLogDetails} }`, 'info');
    addLog('SCORING', `Final Authenticity Score Calculated: ${finalScore.toFixed(2)}`, 'success');


    if (activeRunIdRef.current !== runId) return;
    updateState({ currentStep: 'Synthesizing Final Report (AI Agent)...', finalScore });
    addLog('AGENT REASONING', 'Contacting LLM for executive summary generation...', 'info');

    const report = await generateForensicReport(currentCaseState);

    if (activeRunIdRef.current !== runId) return;

    const finalCaseState = {
        ...currentCaseState,
        finalScore: finalScore,
        agentReasoning: report.reasoning,
        executiveSummary: report.summary,
        currentStep: 'Investigation Closed'
    };

    setCaseData(finalCaseState);


    setHistory(prev => ({
        ...prev,
        [selectedMode]: [finalCaseState, ...prev[selectedMode]]
    }));

    addLog('COMPLETE', 'Case closed. Report generated.', 'success');
    setIsProcessing(false);
  };



  const renderHome = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* Header / Top Bar */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Scan className="text-cyan-400 w-8 h-8 flex-shrink-0" />
              <span>KSHURA <span className="text-slate-500 font-light">FORENSICS</span></span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Autonomous Digital Image Verification Agent</p>
          </div>

          <div className="flex gap-4 w-full xl:w-auto justify-end">
            {caseData.fileHash && (
                <div className="text-right hidden xl:block">
                    <div className="text-[10px] text-slate-500 uppercase font-mono">Current Hash (SHA-256)</div>
                    <div className="text-xs text-cyan-500 font-mono bg-cyan-950/30 px-2 py-1 rounded border border-cyan-900/50 max-w-[200px] truncate">
                        {caseData.fileHash}
                    </div>
                </div>
            )}

            <button
                onClick={triggerFileUpload}
                disabled={isProcessing}
                className={`flex items-center gap-2 px-6 py-3 rounded font-bold transition-all shadow-lg whitespace-nowrap ${
                    isProcessing
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/20'
                }`}
            >
                {isProcessing ? (
                    <>
                       <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                       PROCESSING...
                    </>
                ) : (
                    <>
                       <UploadCloud className="w-5 h-5" />
                       UPLOAD EVIDENCE
                    </>
                )}
            </button>
          </div>
        </header>

        {/* Start State / Drop Zone */}
        {!caseData.caseId && !isProcessing && (
             <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileUpload}
                className={`h-[40vh] flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer group
                    ${isDragging
                        ? 'border-cyan-400 bg-cyan-950/10 scale-[1.01] shadow-[0_0_30px_rgba(6,182,212,0.15)]'
                        : 'border-slate-800 bg-slate-900/20 hover:border-slate-600 hover:bg-slate-900/40'
                    }
                `}
             >
                <div className={`p-6 rounded-full mb-6 transition-all duration-300 ${isDragging ? 'bg-cyan-950 text-cyan-400' : 'bg-slate-800/50 text-slate-600 group-hover:text-slate-400 group-hover:bg-slate-800'}`}>
                    <UploadCloud className={`w-12 h-12 ${isDragging ? 'animate-bounce' : ''}`} />
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${isDragging ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {isDragging ? 'Drop Evidence to Analyze' : 'Upload Digital Evidence'}
                </h3>
                <p className="text-slate-600 mt-2 max-w-md text-center group-hover:text-slate-500">
                    Active Mode: <span className="text-cyan-400 uppercase font-bold border border-cyan-900/50 bg-cyan-950/30 px-2 py-0.5 rounded text-xs ml-2">{selectedMode.replace('_', ' ')}</span>
                    <br/>
                    Drag and drop your image file here, or click to browse.
                    <br />
                    <span className="text-xs font-mono opacity-50 mt-2 block">SUPPORTED FORMATS: JPG, PNG, TIFF, HEIC</span>
                </p>
             </div>
        )}

        {/* Dashboard Grid */}
        {caseData.caseId && (
            <main className="space-y-8 animate-in fade-in duration-500">

                {/* Section 1: Metadata & Map */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Terminal className="w-4 h-4" /> Evidence Metadata
                        </h3>
                        {caseData.metadata ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-sm">
                                <div className="min-w-0">
                                    <span className="block text-slate-600 text-xs">Filename</span>
                                    <span className="text-slate-200 truncate block" title={caseData.metadata.filename}>{caseData.metadata.filename}</span>
                                </div>
                                <div className="min-w-0">
                                    <span className="block text-slate-600 text-xs">Dimensions</span>
                                    <span className="text-slate-200 truncate block">{caseData.metadata.dimensions}</span>
                                </div>
                                <div className="min-w-0">
                                    <span className="block text-slate-600 text-xs">Camera</span>
                                    <span className="text-cyan-300 truncate block" title={caseData.metadata.cameraModel}>{caseData.metadata.cameraModel}</span>
                                </div>
                                <div className="min-w-0">
                                    <span className="block text-slate-600 text-xs">Software</span>
                                    <span className={`truncate block ${caseData.metadata.software?.includes('Adobe') ? 'text-rose-400' : 'text-slate-200'}`} title={caseData.metadata.software}>
                                        {caseData.metadata.software}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-12 bg-slate-800/50 rounded animate-pulse"></div>
                        )}
                    </div>

                    <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-lg flex flex-col overflow-hidden relative min-h-[250px] group">
                        {/* Header & Info overlay */}
                        <div className="absolute top-0 left-0 w-full z-20 p-6 pointer-events-none bg-gradient-to-b from-slate-950/90 to-transparent">
                             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Geo-Tag Data
                            </h3>
                             {caseData.metadata?.gps && (
                                <>
                                    <div className="text-xl font-mono text-slate-100 font-bold truncate">{caseData.metadata.gps.locationName}</div>
                                    <div className="text-xs text-slate-500 font-mono">
                                        {caseData.metadata.gps.lat.toFixed(4)}, {caseData.metadata.gps.lng.toFixed(4)}
                                    </div>
                                </>
                             )}
                        </div>

                        {/* Interactive Map Layer */}
                        <div className="flex-1 w-full h-full absolute inset-0 z-10">
                            {caseData.metadata?.gps ? (
                                <MapPreview
                                    lat={caseData.metadata.gps.lat}
                                    lng={caseData.metadata.gps.lng}
                                    label={caseData.metadata.gps.locationName}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                    <span className="text-slate-600 text-sm italic">Searching GPS metadata...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: Progress Indicator */}
                {isProcessing && (
                    <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-10 flex items-center px-4 relative overflow-hidden">
                        <span className="relative z-10 text-xs font-mono text-cyan-400 animate-pulse flex items-center gap-2">
                            <BrainCircuit className="w-3 h-3" />
                            AGENT STATUS: {caseData.currentStep}
                        </span>
                        <div className="absolute top-0 left-0 h-full bg-cyan-900/20 w-full animate-pulse"></div>
                    </div>
                )}

                {/* Section 3: Analysis Nodes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <NodeCard node={caseData.nodes.deepfake} icon={<Scan className="w-5 h-5" />} />
                    <NodeCard node={caseData.nodes.region_quality} icon={<ScanEye className="w-5 h-5" />} />
                    <NodeCard node={caseData.nodes.dct} icon={<Layers className="w-5 h-5" />} />
                    <NodeCard node={caseData.nodes.prnu} icon={<Camera className="w-5 h-5" />} />
                    <NodeCard node={caseData.nodes.clone} icon={<Copy className="w-5 h-5" />} />
                    <NodeCard node={caseData.nodes.ela} icon={<Hash className="w-5 h-5" />} />
                    <NodeCard node={caseData.nodes.noise} icon={<Fingerprint className="w-5 h-5" />} />
                    <NodeCard node={caseData.nodes.lighting} icon={<Sun className="w-5 h-5" />} />
                    <NodeCard node={caseData.nodes.strings} icon={<Binary className="w-5 h-5" />} />
                </div>

                {/* Section 4: Final Report */}
                <ReportView caseData={caseData} />

            </main>
        )}
    </div>
  );

  const renderHistory = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <Database className="w-8 h-8 text-cyan-400" />
            Case Archives: <span className="text-slate-500 font-light">{selectedMode.replace('_', ' ').toUpperCase()}</span>
        </h1>

        {/* Search Bar and Archives */}
        <div className="mb-8 bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex-1 flex items-center gap-3 bg-slate-950 border border-slate-800 rounded px-3 py-2 focus-within:border-cyan-500/50 transition-colors max-w-xl">
                    <Search className="w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search Archives by Case ID or File Hash..."
                        className="bg-transparent border-none outline-none text-sm text-slate-200 w-full placeholder:text-slate-600 font-mono"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-2 rounded border transition-colors flex items-center gap-2 text-xs font-bold font-mono ${showFilters ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        <span>FILTERS</span>
                    </button>
                    <button
                        onClick={() => importInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors text-xs font-bold font-mono"
                        title="Import JSON history"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>IMPORT JSON</span>
                    </button>
                    <button
                        onClick={() => exportHistoryToJSON(selectedMode)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors text-xs font-bold font-mono"
                        title="Export history to JSON"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>EXPORT JSON</span>
                    </button>
                    <button
                        onClick={() => exportHistoryToCSV(selectedMode)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors text-xs font-bold font-mono"
                        title="Export history to CSV"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>EXPORT CSV</span>
                    </button>
                    <button
                        onClick={() => clearHistory(selectedMode)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/50 transition-colors text-xs font-bold font-mono"
                        title="Clear all cases for this mode"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>CLEAR ARCHIVES</span>
                    </button>
                </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950 rounded border border-slate-800 animate-in slide-in-from-top-2">
                    <div>
                        <label className="block text-[10px] text-slate-500 uppercase mb-1">Risk Level</label>
                        <select
                            value={filterRisk}
                            onChange={(e) => setFilterRisk(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs p-2 rounded focus:border-cyan-500 outline-none"
                        >
                            <option value="ALL">All Risk Levels</option>
                            <option value="LOW">Low Risk</option>
                            <option value="MEDIUM">Medium Risk</option>
                            <option value="HIGH">High Risk</option>
                            <option value="CRITICAL">Critical</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] text-slate-500 uppercase mb-1">Camera Model</label>
                        <input
                            type="text"
                            placeholder="e.g. Canon, iPhone"
                            value={filterCamera}
                            onChange={(e) => setFilterCamera(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs p-2 rounded focus:border-cyan-500 outline-none"
                        />
                    </div>
                    <div>
                         <label className="block text-[10px] text-slate-500 uppercase mb-1">Date Range</label>
                         <div className="flex gap-2">
                             <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                className="w-1/2 bg-slate-900 border border-slate-800 text-slate-300 text-xs p-2 rounded focus:border-cyan-500 outline-none"
                             />
                             <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                className="w-1/2 bg-slate-900 border border-slate-800 text-slate-300 text-xs p-2 rounded focus:border-cyan-500 outline-none"
                             />
                         </div>
                    </div>
                </div>
            )}

            {/* Search Results / History Table */}
            <div className="overflow-hidden rounded border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                 <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider">
                        <tr>
                            <th className="p-3">Case ID</th>
                            <th className="p-3">Mode</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Camera</th>
                            <th className="p-3">Hash</th>
                            <th className="p-3 text-right">Score</th>
                            <th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900">
                        {filteredHistory.map(c => (
                            <tr key={c.caseId} className="hover:bg-slate-800/50 transition-colors group">
                                <td className="p-3 text-cyan-400 font-bold">{c.caseId}</td>
                                <td className="p-3 text-slate-400 uppercase text-[10px] tracking-wide">{c.mode?.replace('_', ' ') || 'General'}</td>
                                <td className="p-3 text-slate-400">{new Date(c.acquisitionTime).toLocaleDateString()}</td>
                                <td className="p-3 text-slate-400">{c.metadata?.cameraModel || 'Unknown'}</td>
                                <td className="p-3 text-slate-500 truncate max-w-[150px]">{c.fileHash.substring(0, 12)}...</td>
                                <td className="p-3 text-right font-bold">
                                    <span className={c.finalScore && c.finalScore > 80 ? 'text-emerald-500' : 'text-rose-500'}>
                                        {c.finalScore?.toFixed(0)}%
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex justify-end items-center gap-4">
                                        <button
                                            onClick={() => loadCase(c)}
                                            className="text-cyan-500 hover:text-cyan-300 underline opacity-0 group-hover:opacity-100 transition-opacity font-bold font-mono"
                                        >
                                            View Report
                                        </button>
                                        <button
                                            onClick={() => deleteCase(c.mode, c.caseId)}
                                            className="text-rose-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-950/30"
                                            title="Delete Case"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredHistory.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-4 text-center text-slate-600 italic">No matching records found in {selectedMode} archives.</td>
                            </tr>
                        )}
                    </tbody>
                 </table>
            </div>
        </div>
    </div>
  );

  const renderSettings = () => {

      const hasChanges = pendingMode !== selectedMode || JSON.stringify(pendingWeights) !== JSON.stringify(scoringWeights);

      return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-2xl">
          <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-cyan-400" />
              System Settings
          </h1>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-8">

              {/* Forensics Mode Selector */}
              <div>
                  <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-slate-800 pb-2">Forensic Investigation Mode</h3>
                  <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setPendingMode('general')}
                        className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
                          pendingMode === 'general'
                            ? 'bg-slate-800 border-cyan-500 text-cyan-400 shadow-lg'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                        }`}
                      >
                        <Shield className="w-6 h-6 mb-2" />
                        <span className="font-bold text-xs">General</span>
                        <div className="w-full flex justify-center mt-2">
                            {pendingMode === 'general' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                      </button>

                      <button
                        onClick={() => setPendingMode('insurance')}
                        className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
                          pendingMode === 'insurance'
                            ? 'bg-slate-800 border-cyan-500 text-cyan-400 shadow-lg'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                        }`}
                      >
                        <Briefcase className="w-6 h-6 mb-2" />
                        <span className="font-bold text-xs">Insurance</span>
                         <div className="w-full flex justify-center mt-2">
                            {pendingMode === 'insurance' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                      </button>

                      <button
                        onClick={() => setPendingMode('customer_care')}
                        className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
                          pendingMode === 'customer_care'
                            ? 'bg-slate-800 border-cyan-500 text-cyan-400 shadow-lg'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                        }`}
                      >
                        <ShoppingBag className="w-6 h-6 mb-2" />
                        <span className="font-bold text-xs">Customer Care</span>
                         <div className="w-full flex justify-center mt-2">
                            {pendingMode === 'customer_care' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                      </button>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">Changing the mode switches the underlying archives and agent persona.</p>
              </div>

              {/* Scoring Weights Config */}
              <div>
                  <div className="flex justify-between items-end border-b border-slate-800 pb-2 mb-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scoring Model Configuration</h3>
                      <div className="flex gap-4">
                          <button
                             onClick={() => setPendingWeights(DEFAULT_MODE_WEIGHTS[pendingMode])}
                             className="text-[10px] flex items-center gap-1 text-cyan-400 hover:text-cyan-350 transition-colors font-bold font-mono"
                             title="Reset weights for the active mode to factory defaults"
                          >
                              <RotateCcw className="w-3 h-3" /> RESET CURRENT MODE DEFAULTS
                          </button>
                          <button
                             onClick={handleResetAllSettings}
                             className="text-[10px] flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors font-bold font-mono"
                             title="Reset all modes weights to default settings"
                          >
                              <RotateCcw className="w-3 h-3" /> RESET ALL MODES
                          </button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      {(Object.entries(pendingWeights) as [string, number][]).map(([key, weight]) => (
                          <div key={key}>
                              <div className="flex justify-between items-center mb-1">
                                  <label className="text-[10px] text-slate-400 uppercase font-mono tracking-wide flex items-center gap-2">
                                      <Sliders className="w-3 h-3 text-slate-600" />
                                      {key.replace('_', ' ')}
                                  </label>
                                  <span className="text-xs font-bold text-cyan-500 font-mono">{(weight * 100).toFixed(0)}%</span>
                              </div>
                              <input
                                  type="range"
                                  min="0"
                                  max="0.5"
                                  step="0.05"
                                  value={weight}
                                  onChange={(e) => setPendingWeights(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
                              />
                          </div>
                      ))}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-4">Adjust the influence of each forensic module on the final authenticity score. Higher weights mean that module's result has more impact.</p>
              </div>

               {/* SAVE BUTTON SECTION */}
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                      Changes are applied to the active session immediately. Save to persist configuration.
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    disabled={!hasChanges || isSavingSettings}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded font-bold text-sm transition-all shadow-lg ${
                        (!hasChanges || isSavingSettings)
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/20 active:scale-95'
                    }`}
                  >
                    {isSavingSettings ? (
                        <>
                           <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                           SAVING...
                        </>
                    ) : (
                        <>
                           <Save className="w-4 h-4" />
                           SAVE SETTINGS
                        </>
                    )}
                  </button>
              </div>
          </div>
      </div>
      );
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*"
      />

      {/* Hidden Import File Input */}
      <input
        type="file"
        ref={importInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            importHistoryFromJSON(file);
            e.target.value = '';
          }
        }}
        className="hidden"
        accept=".json"
      />

      {/* Navigation Sidebar */}
      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} onNewCase={handleNewCase} currentMode={selectedMode} />

      {/* Right Sidebar - Audit Log (Only on Home) */}
      {activeTab === 'home' && (
        <AuditLog
            logs={caseData.auditLog}
            width={auditLogWidth}
            isOpen={isAuditLogOpen}
            onToggle={() => setIsAuditLogOpen(!isAuditLogOpen)}
            onResize={setAuditLogWidth}
        />
      )}

      {/* Main Content Area */}
      <div
        className="flex-1 p-8 transition-all duration-300 ml-64"
        style={{ marginRight: activeTab === 'home' ? (isAuditLogOpen ? auditLogWidth : 48) : 0 }}
      >
         {activeTab === 'home' && renderHome()}
         {activeTab === 'history' && renderHistory()}
         {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  );
};

export default App;
