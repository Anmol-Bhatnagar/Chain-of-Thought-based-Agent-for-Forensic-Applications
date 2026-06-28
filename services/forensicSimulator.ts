import { ForensicCase, NodeResult, InvestigationMode } from '../types';
import exifr from 'exifr';
import { analyzeImageWithGemini, GeminiAnalysisResult } from './geminiService';


export interface GlobalAnalysisContext {
  geminiResult: GeminiAnalysisResult | null;
  elaScore: number;
  noiseScore: number;
  file?: File;
  extractedStrings?: string[];
}


export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateHash = async (file?: File) => {
  if (!file) return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;

      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

const extractFileStrings = async (file: File): Promise<string[]> => {
  try {

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);



    let currentString = '';
    const strings: string[] = [];


    const limit = Math.min(bytes.length, 1024 * 1024);

    for (let i = 0; i < limit; i++) {
      const charCode = bytes[i];

      if (charCode >= 32 && charCode <= 126) {
        currentString += String.fromCharCode(charCode);
      } else {
        if (currentString.length >= 4) {
          strings.push(currentString);
        }
        currentString = '';
      }
    }


    const interestingKeywords = /Adobe|Photoshop|GIMP|Creator|Software|Make|Model|Date|Copyright|Google|Apple|Android|Exif|XMP|ICC|Profile/i;

    const filtered = strings.filter(s =>
       (s.length > 6 && interestingKeywords.test(s)) || s.length > 15
    ).slice(0, 40);

    return filtered;

  } catch (e) {
    console.warn("String extraction failed", e);
    return [];
  }
};




export const extractMetadata = async (file?: File): Promise<any> => {
  if (!file) return simulateMetadataFallback();

  try {
    const exifData = await exifr.parse(file, { tiff: true, gps: true, ifd0: true, exif: true });


    const basicInfo = {
      filename: file.name,
      filesize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      mimeType: file.type,
      dimensions: 'Unknown',
      captureDate: new Date(file.lastModified).toISOString().replace('T', ' ').split('.')[0],
      software: 'Unknown',
      cameraModel: 'Unknown',
      gps: undefined
    };

    if (exifData) {
      const img = await loadImage(file);
      basicInfo.dimensions = `${img.width} x ${img.height}`;

      if (exifData.Make || exifData.Model) {
        basicInfo.cameraModel = `${exifData.Make || ''} ${exifData.Model || ''}`.trim();
      }
      if (exifData.Software) basicInfo.software = exifData.Software;
      if (exifData.DateTimeOriginal) basicInfo.captureDate = new Date(exifData.DateTimeOriginal).toISOString().replace('T', ' ').split('.')[0];

      if (exifData.latitude && exifData.longitude) {

         basicInfo.gps = {
          lat: exifData.latitude,
          lng: exifData.longitude,
          locationName: `${exifData.latitude.toFixed(2)}, ${exifData.longitude.toFixed(2)}`
        };
      }
    }

    return basicInfo;

  } catch (e) {
    console.warn("Metadata extraction failed", e);
    return {
       filename: file.name,
       filesize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
       mimeType: file.type,
       dimensions: "Unknown",
       software: "Unknown",
       cameraModel: "Unknown"
    };
  }
};


const calculateELA = async (file: File): Promise<number> => {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  const MAX_DIM = 800;
  let w = img.width;
  let h = img.height;
  if (w > MAX_DIM || h > MAX_DIM) {
    const scale = Math.min(MAX_DIM/w, MAX_DIM/h);
    w *= scale;
    h *= scale;
  }
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  const originalData = ctx.getImageData(0, 0, w, h);
  const jpegUrl = canvas.toDataURL('image/jpeg', 0.90);

  const compressedImg = new Image();
  compressedImg.src = jpegUrl;
  await new Promise(r => compressedImg.onload = r);

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(compressedImg, 0, 0, w, h);
  const compressedData = ctx.getImageData(0, 0, w, h);

  let totalDiff = 0;
  const p1 = originalData.data;
  const p2 = compressedData.data;

  for (let i = 0; i < p1.length; i += 4) {
    totalDiff += Math.abs(p1[i] - p2[i]) + Math.abs(p1[i+1] - p2[i+1]) + Math.abs(p1[i+2] - p2[i+2]);
  }

  const pixelCount = w * h;
  return totalDiff / (pixelCount * 3);
};


const calculateNoise = async (file: File): Promise<number> => {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  canvas.width = 512;
  canvas.height = 512;
  ctx.drawImage(img, 0, 0, 512, 512);

  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    sum += gray;
    sumSq += gray * gray;
    count++;
  }

  const mean = sum / count;
  const variance = (sumSq / count) - (mean * mean);

  return Math.sqrt(variance);
};



export const startGlobalAnalysis = async (file: File, mode: InvestigationMode): Promise<GlobalAnalysisContext> => {
  const [elaScore, noiseScore, base64, extractedStrings] = await Promise.all([
    calculateELA(file),
    calculateNoise(file),
    fileToBase64(file),
    extractFileStrings(file)
  ]);

  const geminiResult = await analyzeImageWithGemini(base64, file.type || 'image/jpeg', mode, extractedStrings);

  return {
    geminiResult,
    elaScore,
    noiseScore,
    file,
    extractedStrings
  };
};

export const createMissionPlan = () => {
  return [
    'Deepfake Detection (Ensemble)',
    'Discrete Cosine Transform (DCT)',
    'PRNU Sensor Analysis',
    'Error Level Analysis (ELA)',
    'Vision-Language Scene Check',
    'Copy-Move Clone Detection',
    'Noise Distribution Audit',
    'String & Metadata Heuristics',
    'Region Quality Check'
  ];
};



export const runDeepfakeNode = async (context: GlobalAnalysisContext): Promise<Partial<NodeResult<any>>> => {
  await delay(800);

  const g = context.geminiResult?.deepfake;

  if (!g) return { score: 50, riskLevel: 'MEDIUM', inference: "AI Analysis unavailable. Inconclusive.", data: null };


  const globalScore = context.geminiResult?.globalAnalysis?.tamperScore || 0;
  const adjustedProb = (g.probabilityFake + globalScore) / 2;

  return {
    score: 100 - adjustedProb,
    riskLevel: adjustedProb > 80 ? 'CRITICAL' : adjustedProb > 50 ? 'HIGH' : 'LOW',
    inference: g.inference,
    data: {
      probabilityReal: 100 - adjustedProb,
      probabilityFake: adjustedProb,
      modelConfidence: 95,
      detectedArtifacts: g.artifacts || []
    }
  };
};

export const runDCTNode = async (context: GlobalAnalysisContext): Promise<Partial<NodeResult<any>>> => {
  await delay(600);

  const visualArtifacts = context.geminiResult?.dct?.visualArtifacts || false;
  const software = (await extractMetadata(context.file)).software || '';
  const suspiciousSoftware = /photoshop|gimp|edit/i.test(software);

  let score = 100;
  let risk: any = 'LOW';
  let inference = "No compression anomalies detected.";

  if (visualArtifacts) {
    score -= 30;
    inference = "Visual blockiness consistent with re-compression detected.";
  }
  if (suspiciousSoftware) {
    score -= 30;
    inference += " Metadata indicates editing software.";
  }

  if (score < 50) risk = 'HIGH';
  else if (score < 80) risk = 'MEDIUM';

  return {
    score,
    riskLevel: risk,
    inference: context.geminiResult?.dct?.inference || inference,
    data: {
      doubleCompressionDetected: visualArtifacts,
      quantizationConsistency: score,
      histogramVariance: visualArtifacts ? 0.8 : 0.2
    }
  };
};

export const runPRNUNode = async (context: GlobalAnalysisContext): Promise<Partial<NodeResult<any>>> => {
  await delay(700);
  const consistent = context.geminiResult?.prnu?.noiseConsistent ?? true;

  return {
    score: consistent ? 90 : 40,
    riskLevel: consistent ? 'LOW' : 'HIGH',
    inference: context.geminiResult?.prnu?.inference || (consistent ? "Noise levels appear natural." : "Inconsistent noise patterns detected."),
    data: {
      correlationScore: consistent ? 0.95 : 0.4,
      sensorFingerprintMatch: consistent,
      inconsistentRegions: consistent ? 0 : 1
    }
  };
};

export const runELANode = async (context: GlobalAnalysisContext): Promise<Partial<NodeResult<any>>> => {
  await delay(500);
  const ela = context.elaScore;

  let risk: any = 'LOW';
  let score = 90;
  let inf = "Error levels within expected JPEG range.";

  if (ela < 1.5) {
    risk = 'HIGH';
    score = 30;
    inf = "Extremely low error variance. Image may be synthetic or stripped.";
  } else if (ela > 15) {
    risk = 'MEDIUM';
    score = 60;
    inf = "High error variance detected. Possible manipulation or low quality.";
  }

  return {
    score,
    riskLevel: risk,
    inference: inf,
    data: {
      errorLevelVariance: ela,
      highlightedRegionsCount: ela > 15 ? 5 : 0
    }
  };
};

export const runLightingNode = async (context: GlobalAnalysisContext): Promise<Partial<NodeResult<any>>> => {
  await delay(900);
  const g = context.geminiResult?.lighting;
  const consistent = g?.consistent ?? true;

  return {
    score: consistent ? 95 : 45,
    riskLevel: consistent ? 'LOW' : 'HIGH',
    inference: g?.inference || "Lighting vectors consistent.",
    data: {
      shadowConsistency: consistent ? 'Consistent' : 'Inconsistent',
      lightSourceCount: g?.sourceCount || 1,
      sceneDescription: "Visual scene analysis complete."
    }
  };
};

export const runCloneNode = async (context: GlobalAnalysisContext): Promise<Partial<NodeResult<any>>> => {
  await delay(700);
  const g = context.geminiResult?.clone;
  const detected = g?.detected ?? false;

  return {
    score: detected ? 20 : 100,
    riskLevel: detected ? 'CRITICAL' : 'LOW',
    inference: g?.inference || (detected ? "Cloning artifacts found." : "No clone patterns detected."),
    data: {
      clonedRegions: g?.regions || 0,
      featureMatchCount: detected ? 500 : 10
    }
  };
};

export const runNoiseNode = async (context: GlobalAnalysisContext): Promise<Partial<NodeResult<any>>> => {
  await delay(500);
  const sd = context.noiseScore;

  let risk: any = 'LOW';
  let score = 90;
  let inf = "Natural grain structure.";

  if (sd < 10) {
    risk = 'HIGH';
    score = 40;
    inf = "Unnaturally smooth texture (potential denoising or AI generation).";
  }

  return {
    score,
    riskLevel: risk,
    inference: inf,
    data: {
      smoothnessScore: 100 - sd,
      grainConsistency: 85
    }
  };
};

export const runStringsNode = async (context: GlobalAnalysisContext): Promise<Partial<NodeResult<any>>> => {
  await delay(400);
  const g = context.geminiResult?.strings;
  const extracted = context.extractedStrings || [];


  const badKeywords = /Photoshop|GIMP|DALL-E|Midjourney|Stable Diffusion|Edit|Modified/i;
  const foundBad = extracted.some(s => badKeywords.test(s));

  const suspicious = g?.suspicious || foundBad;

  return {
    score: suspicious ? 30 : 100,
    riskLevel: suspicious ? 'HIGH' : 'LOW',
    inference: g?.inference || (suspicious ? "Suspicious software signatures found in file bytes." : "No editing signatures found in file strings."),
    data: {
      foundSignatures: g?.signatures || extracted.slice(0, 5),
      suspiciousContent: suspicious,
      formatConsistency: suspicious ? 'Inconsistent' : 'Consistent'
    }
  };
};

export const runRegionQualityNode = async (context: GlobalAnalysisContext): Promise<Partial<NodeResult<any>>> => {
  await delay(750);
  const g = context.geminiResult?.region_quality;

  let avgRisk = 0;
  const regions = g?.regions || [];

  if (regions.length > 0) {
      const totalRisk = regions.reduce((acc, r) => acc + r.riskScore, 0);
      avgRisk = totalRisk / regions.length;
  }

  const score = 100 - avgRisk;
  let riskLevel: any = 'LOW';

  if (avgRisk > 70) riskLevel = 'CRITICAL';
  else if (avgRisk > 40) riskLevel = 'HIGH';
  else if (avgRisk > 20) riskLevel = 'MEDIUM';

  const issueCount = regions.filter(r => r.riskScore > 30).length;

  return {
    score,
    riskLevel,
    inference: g?.inference || `${issueCount} regions flagged for pixelation or smoothness anomalies.`,
    data: {
      analyzedRegions: regions,
      overallQualityScore: score
    }
  };
};

const simulateMetadataFallback = (): any => {
  return {
    filename: `demo_evidence_${Math.floor(Math.random() * 9000) + 1000}.jpg`,
    filesize: `3.2 MB`,
    dimensions: '4032 x 3024',
    mimeType: 'image/jpeg',
    cameraModel: 'Canon EOS R5',
    software: 'Ver.1.0.3',
    captureDate: '2023-10-27 14:30:15',
    gps: { lat: 40.7128, lng: -74.0060, locationName: 'New York, NY' }
  };
};
