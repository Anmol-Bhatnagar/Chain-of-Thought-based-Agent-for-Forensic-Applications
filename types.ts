
export type AnalysisStatus = 'idle' | 'processing' | 'completed' | 'failed';

export type InvestigationMode = 'general' | 'insurance' | 'customer_care';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  status: 'info' | 'success' | 'warning' | 'error';
}

export interface AnalysisStep {
  id: string;
  order: number;
  timestamp: string;
  type: 'PLAN' | 'EXECUTION' | 'FINDING';
  title: string;
  detail: string;
  risk?: string;
}

export interface Metadata {
  filename: string;
  filesize: string;
  dimensions: string;
  mimeType: string;
  cameraModel?: string;
  software?: string;
  captureDate?: string;
  gps?: {
    lat: number;
    lng: number;
    locationName?: string;
  };
}

export interface NodeResult<T> {
  id: string;
  name: string;
  status: AnalysisStatus;
  data: T | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number; // 0 to 100, where 100 is authentic, 0 is fake
  inference: string; // The "thought" from that specific node
}

// Specific Node Data Types
export interface DeepfakeData {
  probabilityReal: number;
  probabilityFake: number;
  modelConfidence: number;
  detectedArtifacts: string[];
}

export interface DCTData {
  doubleCompressionDetected: boolean;
  quantizationConsistency: number; // 0-100
  histogramVariance: number;
}

export interface PRNUData {
  correlationScore: number;
  sensorFingerprintMatch: boolean;
  inconsistentRegions: number;
}

export interface ELAData {
  errorLevelVariance: number; // Percentage
  highlightedRegionsCount: number;
}

export interface LightingData {
  shadowConsistency: 'Consistent' | 'Inconsistent' | 'Indeterminate';
  lightSourceCount: number;
  sceneDescription: string;
}

export interface CloneData {
  clonedRegions: number;
  featureMatchCount: number;
}

export interface NoiseData {
  smoothnessScore: number; // High means suspiciously smooth
  grainConsistency: number; // 0-100
}

export interface StringsData {
  foundSignatures: string[];
  suspiciousContent: boolean;
  formatConsistency: 'Consistent' | 'Inconsistent';
}

export interface RegionQualityData {
  analyzedRegions: Array<{
    name: string;
    issue: 'None' | 'Pixelation' | 'Unnatural Smoothness' | 'Blurring' | 'Artifacts';
    riskScore: number; // 0-100
  }>;
  overallQualityScore: number;
}

export interface ForensicCase {
  caseId: string;
  mode: InvestigationMode;
  fileHash: string;
  acquisitionTime: string;
  metadata: Metadata | null;
  
  // Analysis Nodes
  nodes: {
    deepfake: NodeResult<DeepfakeData>;
    dct: NodeResult<DCTData>;
    prnu: NodeResult<PRNUData>;
    ela: NodeResult<ELAData>;
    lighting: NodeResult<LightingData>;
    clone: NodeResult<CloneData>;
    noise: NodeResult<NoiseData>;
    strings: NodeResult<StringsData>;
    region_quality: NodeResult<RegionQualityData>;
  };

  // Final Synthesis
  finalScore: number | null; // Weighted average
  finalVerdict: 'Authentic' | 'Suspicious' | 'Manipulated' | 'Inconclusive' | null;
  agentReasoning: string | null;
  executiveSummary: string | null;
  
  auditLog: AuditLogEntry[];
  analysisTrace: AnalysisStep[]; // Chain of Thought
  currentStep: string;
}
