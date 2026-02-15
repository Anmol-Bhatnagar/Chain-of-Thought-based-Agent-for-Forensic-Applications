# Design Document: Forensic Image Analysis

## Overview

Kshura Forensics is an autonomous AI-powered forensic image analysis system that combines Google Gemini's multimodal vision capabilities with client-side signal processing to detect image manipulation, deepfakes, and fraud. The system employs a Supervisor Agent that dynamically orchestrates forensic tests based on findings, providing comprehensive reports with full audit trails for chain of custody.

### Key Design Principles

1. **Autonomous Decision-Making**: AI agent dynamically selects which forensic tests to run based on intermediate findings
2. **Mode-Specific Analysis**: Tailored investigation strategies for general, insurance, and customer care contexts
3. **Chain of Custody**: Complete audit logging and analysis traces for legal defensibility
4. **Hybrid Analysis**: Combines AI vision analysis with traditional signal processing techniques
5. **Graceful Degradation**: System continues operation even when external services fail

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (App.tsx)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Upload &   │  │  Settings &  │  │   History &  │      │
│  │   Analysis   │  │    Config    │  │    Search    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
│  Forensic      │  │   Gemini    │  │   UI Components │
│  Simulator     │  │   Service   │  │   (NodeCard,    │
│  (Client-side  │  │   (AI       │  │    ReportView,  │
│   Processing)  │  │   Analysis) │  │    AuditLog)    │
└────────────────┘  └─────────────┘  └─────────────────┘
```

### Data Flow

1. **Image Upload** → Hash Generation → Metadata Extraction
2. **Global Analysis** → Gemini Vision + Client-side Processing (ELA, Noise)
3. **Autonomous Loop** → Supervisor Agent selects next node → Execute node → Record trace
4. **Scoring** → Weighted average of completed nodes
5. **Report Generation** → Gemini synthesizes findings → PDF export

### Investigation Modes

The system supports three investigation modes, each with tailored analysis priorities:

- **General**: Balanced forensic analysis for any manipulation detection
- **Insurance**: Prioritizes license plate, damage region, and reflection analysis for claims verification
- **Customer Care**: Prioritizes foreign object detection, label integrity, and container state for complaint verification

## Components and Interfaces

### Core Data Structures

#### ForensicCase
```typescript
interface ForensicCase {
  caseId: string;                    // Unique identifier (CASE-XXXXX)
  mode: InvestigationMode;           // Investigation context
  fileHash: string;                  // SHA-256 hash for chain of custody
  acquisitionTime: string;           // ISO timestamp
  metadata: Metadata | null;         // EXIF data
  nodes: {                           // 9 analysis nodes
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
  finalScore: number | null;         // 0-100 authenticity score
  finalVerdict: string | null;       // Authentic/Suspicious/Manipulated
  agentReasoning: string | null;     // AI explanation
  executiveSummary: string | null;   // Report summary
  auditLog: AuditLogEntry[];         // Chain of custody
  analysisTrace: AnalysisStep[];     // Agent decision trace
  currentStep: string;               // UI progress indicator
}
```

#### NodeResult<T>
```typescript
interface NodeResult<T> {
  id: string;
  name: string;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  data: T | null;                    // Node-specific data
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;                     // 0-100 (100 = authentic)
  inference: string;                 // Human-readable finding
}
```

#### GlobalAnalysisContext
```typescript
interface GlobalAnalysisContext {
  geminiResult: GeminiAnalysisResult | null;  // AI vision analysis
  elaScore: number;                           // Client-side ELA
  noiseScore: number;                         // Client-side noise
  file?: File;                                // Original file
  extractedStrings?: string[];                // File byte strings
}
```

### Service Layer

#### forensicSimulator.ts

**Purpose**: Client-side signal processing and node execution

**Key Functions**:
- `extractMetadata(file)`: EXIF parsing using exifr library
- `generateHash(file)`: SHA-256 hash generation
- `calculateELA(file)`: Error level analysis via re-compression
- `calculateNoise(file)`: Noise variance calculation
- `extractFileStrings(file)`: ASCII string extraction from file bytes
- `startGlobalAnalysis(file, mode)`: Orchestrates initial analysis
- `runDeepfakeNode(context)`: Executes deepfake detection
- `runDCTNode(context)`: Executes DCT analysis
- `runPRNUNode(context)`: Executes PRNU analysis
- `runELANode(context)`: Executes ELA analysis
- `runLightingNode(context)`: Executes lighting analysis
- `runCloneNode(context)`: Executes clone detection
- `runNoiseNode(context)`: Executes noise analysis
- `runStringsNode(context)`: Executes string analysis
- `runRegionQualityNode(context)`: Executes region quality analysis

**Design Decisions**:
- Client-side processing avoids server costs and privacy concerns
- Canvas API used for image manipulation (ELA, noise calculation)
- Maximum 1MB scanned for string extraction to prevent performance issues
- All node runners return partial NodeResult for flexible composition

#### geminiService.ts

**Purpose**: AI-powered analysis using Google Gemini

**Key Functions**:
- `analyzeImageWithGemini(base64, mimeType, mode, strings)`: Multimodal vision analysis
- `getNextInvestigationStep(metadata, completedNodes, availableNodes, mode)`: Supervisor agent decision-making
- `generateForensicReport(caseData)`: Final report synthesis

**Design Decisions**:
- Uses `gemini-3-flash-preview` model for speed and cost efficiency
- Structured JSON output via `responseMimeType: 'application/json'`
- Mode-specific prompts tailor AI behavior to investigation context
- Fallback logic when API calls fail (graceful degradation)
- Single global analysis call to minimize API costs

### UI Components

#### App.tsx (Main Application)

**State Management**:
- `caseData`: Current investigation state
- `history`: Three separate case databases (one per mode)
- `selectedMode`: Active investigation mode
- `scoringWeights`: Configurable node weights
- `isProcessing`: Processing flag for race condition prevention
- `activeRunIdRef`: Unique ID for current investigation run

**Key Functions**:
- `startInvestigation(file)`: Main orchestration loop
- `handleNewCase()`: Reset with confirmation
- `handleSaveSettings()`: Apply configuration changes
- `loadCase(case)`: Load historical case
- `addLog(action, details, status)`: Audit logging

**Race Condition Prevention**:
- Each investigation generates a unique `runId`
- All state updates check `activeRunIdRef.current === runId`
- Starting new case or changing mode invalidates previous `runId`
- Prevents stale async updates from corrupted investigations

#### NodeCard.tsx

**Purpose**: Display individual analysis node results

**Features**:
- Color-coded risk levels (green/amber/red)
- Processing animations
- Node-specific data visualizations (probability bars, metrics)
- Responsive card layout

#### ReportView.tsx

**Purpose**: Display and export forensic reports

**Features**:
- Executive summary display
- Chain-of-thought timeline visualization
- PDF export with jsPDF library
- Multi-page PDF with headers, footers, and page numbers

#### AuditLog.tsx

**Purpose**: Real-time audit log display

**Features**:
- Resizable panel (240px - 600px)
- Collapsible sidebar
- Auto-scroll to latest entry
- Color-coded status icons
- Timestamp display

## Data Models

### Metadata Structure

```typescript
interface Metadata {
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
```

### Analysis Node Data Types

Each node has specific data structures:

- **DeepfakeData**: `probabilityReal`, `probabilityFake`, `modelConfidence`, `detectedArtifacts[]`
- **DCTData**: `doubleCompressionDetected`, `quantizationConsistency`, `histogramVariance`
- **PRNUData**: `correlationScore`, `sensorFingerprintMatch`, `inconsistentRegions`
- **ELAData**: `errorLevelVariance`, `highlightedRegionsCount`
- **LightingData**: `shadowConsistency`, `lightSourceCount`, `sceneDescription`
- **CloneData**: `clonedRegions`, `featureMatchCount`
- **NoiseData**: `smoothnessScore`, `grainConsistency`
- **StringsData**: `foundSignatures[]`, `suspiciousContent`, `formatConsistency`
- **RegionQualityData**: `analyzedRegions[]`, `overallQualityScore`

### Audit Log Entry

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: string;              // HH:MM:SS format
  action: string;                 // Action type
  details: string;                // Description
  status: 'info' | 'success' | 'warning' | 'error';
}
```

### Analysis Trace Step

```typescript
interface AnalysisStep {
  id: string;
  order: number;
  timestamp: string;
  type: 'PLAN' | 'EXECUTION' | 'FINDING';
  title: string;
  detail: string;
  risk?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid Image Upload Acceptance
*For any* valid image file (JPEG, PNG, TIFF, HEIC), when uploaded to the system, the investigation process should initiate and generate a case ID.
**Validates: Requirements 1.1**

### Property 2: Non-Image File Rejection
*For any* non-image file, when uploaded to the system, the file should be rejected and an error log entry should be created.
**Validates: Requirements 1.3**

### Property 3: SHA-256 Hash Generation
*For any* uploaded image file, the system should generate a valid 64-character hexadecimal SHA-256 hash.
**Validates: Requirements 1.4**

### Property 4: ISO Timestamp Format
*For any* case acquisition timestamp, the timestamp should be in valid ISO 8601 format.
**Validates: Requirements 1.5**

### Property 5: Upload Prevention During Processing
*For any* system state where `isProcessing` is true, attempting to upload a new file should be rejected.
**Validates: Requirements 1.6**

### Property 6: Mode Change State Reset
*For any* investigation mode change when case data exists, the case data should be reset to initial state after confirmation.
**Validates: Requirements 2.2**

### Property 7: Mode Parameter Propagation
*For any* investigation mode selection, the mode parameter should be correctly passed to the Supervisor Agent and all analysis functions.
**Validates: Requirements 2.4**

### Property 8: EXIF Metadata Extraction
*For any* image file with EXIF data, the metadata extraction should return an object containing camera model, software, and capture date fields.
**Validates: Requirements 3.1**

### Property 9: GPS Coordinate Extraction
*For any* image file with GPS EXIF tags, the metadata extraction should return latitude and longitude coordinates.
**Validates: Requirements 3.2**

### Property 10: Graceful Metadata Failure
*For any* image file where metadata extraction fails, the system should continue analysis without crashing and use fallback values.
**Validates: Requirements 3.5**

### Property 11: Editing Software Warning
*For any* image with editing software detected in metadata (e.g., "Photoshop", "GIMP"), the audit log should contain a warning entry.
**Validates: Requirements 3.6**

### Property 12: Gemini Vision Analysis Invocation
*For any* investigation start, the system should invoke the Gemini Vision API with the image data and investigation mode.
**Validates: Requirements 4.1**

### Property 13: Iterative Node Selection
*For any* investigation with available nodes, the Supervisor Agent should be called to select the next node until all nodes are completed or FINISH is returned.
**Validates: Requirements 4.2**

### Property 14: Agent Context Completeness
*For any* Supervisor Agent invocation, the agent should receive metadata, completed node results, available node keys, and investigation mode.
**Validates: Requirements 4.3**

### Property 15: Early Termination Option
*For any* Supervisor Agent decision, the agent should have the option to return "FINISH" to conclude the investigation early.
**Validates: Requirements 4.4**

### Property 16: Investigation Conclusion
*For any* investigation where all nodes are completed, the Supervisor Agent loop should terminate.
**Validates: Requirements 4.5**

### Property 17: Decision Trace Recording
*For any* Supervisor Agent decision, an analysis trace entry should be created with the decision reasoning.
**Validates: Requirements 4.6**

### Property 18: Maximum Iteration Bound
*For any* investigation, the Supervisor Agent loop should execute a maximum of 9 iterations.
**Validates: Requirements 4.7**

### Property 19: Node Score Validity
*For any* completed analysis node, the score should be a number between 0 and 100 inclusive.
**Validates: Requirements 5.2, 6.1-6.5, 7.1-7.4, 8.1-8.5, 9.1-9.4, 10.1-10.4, 11.1-11.4, 12.1-12.5, 13.1-13.6**

### Property 20: Risk Level Assignment
*For any* completed analysis node, the risk level should be correctly assigned based on the score: CRITICAL (score < 40), HIGH (40 ≤ score < 60), MEDIUM (60 ≤ score < 80), LOW (score ≥ 80).
**Validates: Requirements 5.3, 5.4, 5.5**

### Property 21: Node Inference Presence
*For any* completed analysis node, the inference field should contain a non-empty string explaining the findings.
**Validates: Requirements 5.6**

### Property 22: Weighted Score Calculation
*For any* investigation with completed nodes, the final score should be calculated as the weighted average of only the completed nodes, normalized by the sum of their weights.
**Validates: Requirements 14.3, 14.4**

### Property 23: Weight Non-Negativity
*For any* weight configuration, all weight values should be non-negative numbers.
**Validates: Requirements 14.6**

### Property 24: Report Generation Invocation
*For any* completed investigation, the system should invoke Gemini AI to generate an executive summary and agent reasoning.
**Validates: Requirements 15.1**

### Property 25: Report Completeness
*For any* generated report, the report should include executive summary, agent reasoning, and findings from all completed nodes.
**Validates: Requirements 15.2, 15.3**

### Property 26: PDF Export Filename
*For any* PDF export, the filename should match the pattern `Kshura_Report_{caseId}.pdf`.
**Validates: Requirements 16.8**

### Property 27: Audit Log Entry Creation
*For any* system action (upload, node execution, error), an audit log entry should be created with timestamp, action, details, and status.
**Validates: Requirements 17.1**

### Property 28: Trace Entry Structure
*For any* analysis trace entry, the entry should include order, timestamp, type (PLAN/EXECUTION/FINDING), title, and detail fields.
**Validates: Requirements 18.2**

### Property 29: Trace Type Validity
*For any* analysis trace entry, the type field should be one of: PLAN, EXECUTION, or FINDING.
**Validates: Requirements 18.3**

### Property 30: Mode-Specific History Storage
*For any* completed investigation, the case should be saved to the history array corresponding to the active investigation mode.
**Validates: Requirements 19.2**

### Property 31: Case Search Filtering
*For any* search query and case history, the filtered results should only include cases where the case ID or file hash contains the search query (case-insensitive).
**Validates: Requirements 20.1**

### Property 32: Multi-Filter AND Logic
*For any* combination of active filters (risk, camera, date range), the filtered results should satisfy all filter conditions simultaneously.
**Validates: Requirements 20.5**

### Property 33: State Reset on New Case
*For any* new case initialization, all analysis nodes should be reset to idle status, and audit log and analysis trace should be cleared.
**Validates: Requirements 21.4, 21.5**

### Property 34: Unique Run ID Generation
*For any* investigation start, the system should generate a unique run ID that differs from all previous run IDs.
**Validates: Requirements 25.1**

### Property 35: Run ID Validation
*For any* state update during an investigation, the update should only be applied if the current run ID matches the active run ID.
**Validates: Requirements 25.2, 25.4**

### Property 36: Run ID Invalidation
*For any* new case start or mode change during processing, the previous run ID should be set to null.
**Validates: Requirements 25.3, 25.5**

### Property 37: Error Handling Graceful Degradation
*For any* error during analysis (API failure, metadata extraction failure, node execution failure), the system should log the error and continue with remaining analysis without crashing.
**Validates: Requirements 27.1, 27.2, 27.3, 27.4, 27.5, 27.6**

## Error Handling

### API Failure Handling

**Gemini API Failures**:
- Missing API key: Log error, return null, continue with client-side analysis only
- Network errors: Catch exception, log error, use fallback values
- JSON parsing errors: Catch exception, log error, use default analysis results

**Fallback Behavior**:
- Deepfake node: Return score 50, MEDIUM risk, "AI Analysis unavailable"
- Supervisor Agent: Return first available node or FINISH
- Report generation: Return generic error message

### Client-Side Processing Errors

**Metadata Extraction**:
- EXIF parsing failure: Use basic file info (filename, size, mime type)
- GPS missing: Set gps field to undefined
- Image loading failure: Log warning, continue with available data

**Signal Processing**:
- Canvas API failure: Return score 0 for ELA/noise
- String extraction failure: Return empty array
- File reading failure: Display error to user, abort investigation

### State Management Errors

**Race Conditions**:
- Prevented by run ID validation
- Stale updates ignored silently
- No error logging needed (expected behavior)

**Invalid State Transitions**:
- Upload during processing: Rejected, no state change
- Mode change during processing: Requires confirmation, invalidates run ID
- Load case during processing: Rejected, no state change

## Testing Strategy

### Dual Testing Approach

The system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Specific EXIF metadata parsing examples
- Specific risk level threshold boundaries
- PDF generation with known case data
- UI component rendering with specific props
- Error handling with specific failure scenarios

**Property-Based Tests**: Focus on universal properties across all inputs
- Hash generation for random image files
- Score calculation for random node combinations
- Filter logic for random case histories
- Run ID validation for random state transitions
- Metadata extraction for random image files

### Property-Based Testing Configuration

**Library**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: forensic-image-analysis, Property {number}: {property_text}`
- Generators for: image files, case data, node results, metadata, timestamps

**Example Test Structure**:
```typescript
// Feature: forensic-image-analysis, Property 3: SHA-256 Hash Generation
it('generates valid SHA-256 hash for any image file', async () => {
  await fc.assert(
    fc.asyncProperty(fc.uint8Array({ minLength: 100, maxLength: 10000 }), async (bytes) => {
      const file = new File([bytes], 'test.jpg', { type: 'image/jpeg' });
      const hash = await generateHash(file);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    }),
    { numRuns: 100 }
  );
});
```

### Testing Priorities

**High Priority** (Core Correctness):
1. Hash generation (Property 3)
2. Score calculation (Property 22)
3. Risk level assignment (Property 20)
4. Run ID validation (Property 35)
5. Filter logic (Property 31, 32)

**Medium Priority** (Business Logic):
6. Metadata extraction (Property 8, 9)
7. Mode parameter propagation (Property 7)
8. Audit log creation (Property 27)
9. Trace recording (Property 17)
10. History storage (Property 30)

**Lower Priority** (Edge Cases):
11. Error handling (Property 37)
12. Upload rejection (Property 2, 5)
13. State reset (Property 33)
14. Iteration bounds (Property 18)

### Integration Testing

**End-to-End Scenarios**:
- Complete investigation flow from upload to report
- Mode switching with active investigation
- Historical case loading and filtering
- PDF export with complete case data
- Error recovery from API failures

**Manual Testing**:
- UI responsiveness across viewport sizes
- Audit log panel resizing
- Map interaction with GPS data
- PDF visual formatting
- Real-time progress updates

### Performance Testing

**Benchmarks**:
- ELA calculation: < 2 seconds for 4K images
- Noise calculation: < 1 second for 4K images
- String extraction: < 500ms for 10MB files
- PDF generation: < 3 seconds for complete reports

**Load Testing**:
- Multiple concurrent investigations (not applicable - single-user app)
- Large case history (1000+ cases): Search and filter performance
- Large image files (50MB+): Memory usage and processing time

## Security Considerations

### Data Privacy

- All processing occurs client-side (no server uploads)
- Image data sent to Gemini API (Google's privacy policy applies)
- No persistent storage (localStorage not used)
- Case history stored in browser memory only (lost on refresh)

### Input Validation

- File type validation (MIME type checking)
- Weight validation (non-negative numbers)
- Run ID validation (prevents race conditions)
- JSON parsing with try-catch (prevents injection)

### API Key Security

- API key stored in environment variable
- Not exposed in client-side code
- Vite build process handles environment variables securely

## Deployment Considerations

### Build Configuration

**Vite Configuration**:
- React plugin for JSX transformation
- TypeScript compilation
- Environment variable injection
- Production build optimization

**Dependencies**:
- React 19.2.3 (UI framework)
- Google GenAI 1.37.0 (Gemini API client)
- exifr 7.1.3 (EXIF parsing)
- jsPDF 2.5.1 (PDF generation)
- Leaflet 1.9.4 (Map display)
- Lucide React 0.562.0 (Icons)
- Recharts 3.6.0 (Charts - if used)

### Environment Setup

**Required Environment Variables**:
- `GEMINI_API_KEY`: Google Gemini API key

**Development**:
```bash
npm install
# Set GEMINI_API_KEY in .env.local
npm run dev
```

**Production**:
```bash
npm run build
# Deploy dist/ folder to static hosting
```

### Browser Compatibility

**Minimum Requirements**:
- Modern browser with ES2020 support
- Canvas API support
- Crypto API support (for SHA-256)
- FileReader API support
- Fetch API support

**Tested Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

### Potential Improvements

1. **Persistent Storage**: IndexedDB for case history persistence
2. **Batch Processing**: Multiple image analysis in sequence
3. **Custom Node Weights**: Per-mode weight configurations
4. **Advanced Visualizations**: Heatmaps for ELA, clone detection overlays
5. **Export Formats**: JSON, CSV export in addition to PDF
6. **Comparison Mode**: Side-by-side comparison of two images
7. **Plugin System**: Custom analysis nodes
8. **Collaborative Features**: Share cases via URL
9. **Advanced Filtering**: Date range picker, multi-select filters
10. **Performance Optimization**: Web Workers for heavy processing

### Scalability Considerations

**Current Limitations**:
- Single-user application (no backend)
- No case history persistence
- Limited to browser memory constraints
- Sequential processing only

**Scaling Path**:
- Add backend API for case storage
- Implement user authentication
- Add database for case history
- Implement parallel node execution
- Add caching for Gemini API responses
- Implement rate limiting for API calls
