import { GoogleGenAI } from "@google/genai";
import { ForensicCase, InvestigationMode } from '../types';

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};


export interface GeminiAnalysisResult {
  deepfake: {
    probabilityFake: number;
    inference: string;
    artifacts: string[];
  };
  lighting: {
    consistent: boolean;
    inference: string;
    sourceCount: number;
  };
  clone: {
    detected: boolean;
    inference: string;
    regions: number;
  };
  dct: {
    visualArtifacts: boolean;
    inference: string;
    description?: string;
  };
  prnu: {
    noiseConsistent: boolean;
    inference: string;
    description?: string;
  };
  strings: {
    suspicious: boolean;
    inference: string;
    signatures: string[];
  };
  region_quality: {
    regions: Array<{
      name: string;
      issue: 'None' | 'Pixelation' | 'Unnatural Smoothness' | 'Blurring' | 'Artifacts';
      riskScore: number;
    }>;
    inference: string;
  };
  globalAnalysis?: {
    tamperScore: number;
    verdict: string;
  };
}

const getAnalysisPrompt = (mode: InvestigationMode, extractedStrings: string[]) => {
  const stringsContext = extractedStrings.length > 0
    ? `Extracted File Strings (Metadata/Hidden Data): ${JSON.stringify(extractedStrings.slice(0, 50))}. Check these for software signatures (e.g., 'Photoshop', 'GIMP') or inconsistencies with the visual content.`
    : "No readable strings extracted.";

  const baseInstructions = `
    Provide your analysis in this strict JSON format:
    {
      "deepfake": {
        "probabilityFake": number (0-100),
        "inference": "string",
        "artifacts": ["string"]
      },
      "lighting": {
        "consistent": boolean,
        "inference": "string",
        "sourceCount": number
      },
      "clone": {
        "detected": boolean,
        "inference": "string",
        "regions": number
      },
      "dct": {
        "visualArtifacts": boolean,
        "inference": "string"
      },
      "prnu": {
        "noiseConsistent": boolean,
        "inference": "string"
      },
      "strings": {
        "suspicious": boolean,
        "inference": "string",
        "signatures": ["string"]
      },
      "region_quality": {
        "regions": [
          { "name": "string", "issue": "None" | "Pixelation" | "Unnatural Smoothness" | "Blurring" | "Artifacts", "riskScore": number (0-100, 100 is high risk) }
        ],
        "inference": "string"
      },
      "globalAnalysis": {
        "tamperScore": number (0-100),
        "verdict": "Authentic" | "Suspicious" | "Fake"
      }
    }
  `;

  if (mode === 'insurance') {
    return `
      You are an Expert Insurance Claims Forensic Analyst.
      Your goal: Verify vehicle/property damage claims and detect fraud (AI generation or photo manipulation).

      Focus Areas:
      1. **Region Integrity**: Check the License Plate (for blurring/text generation artifacts), the Damage Area (for unnatural smoothness/inpainting), and background reflections.
      2. **Vehicle/Property Physics**: Does the dent/damage interact with light correctly? AI often fails at complex reflections on metal.
      3. **Inpainting**: Look for "smudged" license plates or artificially inserted damage.
      4. **Recycled Photos**: Look for screen moire patterns indicating a photo of a screen.
      5. **String Analysis**: ${stringsContext}

      ${baseInstructions}
    `;
  }

  if (mode === 'customer_care') {
    return `
      You are a Fraud Prevention Specialist for a Logistics/Food Delivery platform (e.g., Swiggy, Zomato, Amazon).
      Your goal: Verify customer complaints (e.g., "foreign object in food", "empty box", "wrong item").

      Focus Areas:
      1. **Region Integrity**: Check the specific foreign object (insect, stone) for pixelation (cut-paste) or blurring edges. Check Shipping Labels for text editing.
      2. **Object Insertion**: Is the foreign object actually in the scene, or pasted in (Clone/Deepfake)? Check contact shadows.
      3. **Container State**: Is the package actually empty, or is it a forced perspective?
      4. **Freshness/State**: Does the food condition match the delivery time?
      5. **String Analysis**: ${stringsContext}

      ${baseInstructions}
    `;
  }


  return `
    You are Kshura-Zero, an elite AI Forensic Image Analyst.
    Your objective is to detect ANY sign of digital manipulation, AI generation (GAN/Diffusion), or editing with extreme scrutiny.

    Conduct a rigorous Step-by-Step Analysis:
    1. **Region Integrity**: Identify faces, text, and high-frequency texture areas. Check for smoothness (beauty filters/AI) or pixelation (cloning/resizing).
    2. **Visual Physics & Lighting**: Shadows, reflections, subsurface scattering.
    3. **Biometric & Anatomical**: Pupils, hands, hair, skin texture.
    4. **Signal**: PRNU noise, JPEG compression blocks (DCT).
    5. **String Analysis**: ${stringsContext}

    ${baseInstructions}
  `;
};

export const analyzeImageWithGemini = async (base64Image: string, mimeType: string, mode: InvestigationMode, extractedStrings: string[]): Promise<GeminiAnalysisResult | null> => {
  const ai = getGeminiClient();
  if (!ai) return null;

  const prompt = getAnalysisPrompt(mode, extractedStrings);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as GeminiAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return null;
  }
};


export const getNextInvestigationStep = async (
  metadata: any,
  completedNodes: Array<{id: string, name: string, risk: string, findings: string}>,
  availableNodeKeys: string[],
  mode: InvestigationMode
): Promise<{ nextNode: string; reasoning: string }> => {
  const ai = getGeminiClient();
  if (!ai || availableNodeKeys.length === 0) {
    return { nextNode: 'FINISH', reasoning: "No more tools available or agent offline." };
  }

  let personaInstructions = "";
  if (mode === 'insurance') {
    personaInstructions = `
      ROLE: Insurance Claims Supervisor.
      PRIORITY:
      1. **Region Quality**: CRITICAL. Check license plates and damage zones for inpainting immediately.
      2. **Deepfake/Inpainting**: Essential to confirm if damage is real.
      3. **Lighting**: Critical for verifying dents/scratches on reflective surfaces (cars).
      4. **Metadata/GPS**: Critical to ensure the photo wasn't taken at a different location/time than the claim.

      If 'lighting' or 'deepfake' shows high risk, prioritize 'dct' or 'ela' to find the edit mask.
    `;
  } else if (mode === 'customer_care') {
    personaInstructions = `
      ROLE: E-commerce/Food Delivery Fraud Supervisor.
      PRIORITY:
      1. **Region Quality**: Check labels and foreign objects for pixelation/blur.
      2. **Clone/Copy-Move**: High priority to detect pasted insects/objects in food.
      3. **Deepfake**: To detect AI-generated "proof" photos.

      If the user claims "foreign object", prioritize 'region_quality' and 'clone'.
    `;
  } else {
    personaInstructions = `
      ROLE: General Forensic Supervisor.
      PRIORITY: Global anomaly detection. Balance between signal analysis (PRNU/DCT/Strings) and visual analysis (Lighting/Deepfake/Region Quality).
    `;
  }

  const prompt = `
    You are an autonomous Supervisor Agent.
    ${personaInstructions}

    Current Case State:
    - Metadata: ${JSON.stringify(metadata)}
    - Completed Tests: ${JSON.stringify(completedNodes)}
    - Available Tools: ${JSON.stringify(availableNodeKeys)}

    DECISION PROTOCOL:
    1. **Efficiency**: If we have CRITICAL evidence (Risk: CRITICAL), STOP (return 'FINISH').
    2. **Context**: Use the tool best suited for the specific Industry Role defined above.

    DECISION:
    Return JSON: { "nextNode": "key" | "FINISH", "reasoning": "Why?" }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return { nextNode: availableNodeKeys[0] || 'FINISH', reasoning: "Fallback: Proceeding sequentially." };

    const result = JSON.parse(text);

    if (result.nextNode !== 'FINISH' && !availableNodeKeys.includes(result.nextNode)) {
        return availableNodeKeys.length > 0
           ? { nextNode: availableNodeKeys[0], reasoning: "Invalid selection, defaulting to next tool." }
           : { nextNode: 'FINISH', reasoning: "No valid nodes remaining." };
    }

    return result;

  } catch (error) {
    console.error("Planning Agent Failed:", error);
    return { nextNode: availableNodeKeys[0] || 'FINISH', reasoning: "Agent connection failed. Proceeding sequentially." };
  }
};


export const generateForensicReport = async (caseData: ForensicCase): Promise<{ summary: string; reasoning: string }> => {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      summary: "API Key missing. Unable to generate report.",
      reasoning: "System could not connect to AI reasoning engine."
    };
  }

  const nodeContext = Object.entries(caseData.nodes)
    .filter(([_, node]) => node.status === 'completed')
    .map(([key, node]) => {
      return `${node.name}: Risk ${node.riskLevel} (Score: ${node.score}). Findings: ${node.inference}`;
    }).join('\n');

  let persona = "Senior Digital Forensics Expert";
  let contextInstruction = "Analyze for general manipulation.";

  if (caseData.mode === 'insurance') {
    persona = "Lead Insurance Fraud Investigator";
    contextInstruction = "Assess the validity of the claim. Specifically address if the damage looks fabricated, exaggerated, or inconsistent with the alleged incident.";
  } else if (caseData.mode === 'customer_care') {
    persona = "Customer Trust & Safety Officer";
    contextInstruction = "Assess the customer complaint. Determine if the defect/issue (e.g., bug in food, damaged package) is authentic or a digital fabrication for refund fraud.";
  }

  const prompt = `
    Act as a ${persona}. Generate a Final Decision Report.

    Case ID: ${caseData.caseId}
    Mode: ${caseData.mode}
    Score: ${caseData.finalScore?.toFixed(1)}/100 (100 = Authentic)

    Technical Findings:
    ${nodeContext}

    Instructions:
    1. **Context**: ${contextInstruction}
    2. **Synthesize**: Explain how the technical findings support your verdict.
    3. **Verdict**: Clearly state if the evidence supports the user's claim or indicates fraud.

    Output JSON: { "reasoning": "...", "summary": "..." }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Report Generation Failed:", error);
    return {
      summary: "Error generating report via AI agent.",
      reasoning: "The agent encountered an error while synthesizing the final analysis."
    };
  }
};
