# Kshura Forensics

An autonomous AI-powered forensic image analysis system that detects image manipulation, deepfakes, and fraud using a fine-tuned multimodal LLM combined with client-side signal processing.

## Overview

Kshura Forensics employs a Supervisor Agent that dynamically orchestrates forensic tests based on findings, providing comprehensive reports with full audit trails for chain of custody. The system supports three investigation modes tailored for different use cases: general forensic analysis, insurance claims verification, and customer care complaint validation.

## Features

### Autonomous Analysis
- **AI-Driven Decision Making**: Supervisor Agent dynamically selects which forensic tests to run based on intermediate findings.
- **Mode-Specific Strategies**: Tailored investigation priorities for general, insurance, and customer care contexts.
- **Efficient Processing**: Early termination when critical evidence is detected.

### Forensic Analysis Nodes
1. **Deepfake Detection**: AI generation and synthetic content identification
2. **DCT Analysis**: JPEG compression artifact detection
3. **PRNU Sensor Analysis**: Sensor noise fingerprinting
4. **Error Level Analysis (ELA)**: Compression inconsistency detection
5. **Lighting Consistency**: Shadow and light source analysis
6. **Clone Detection**: Copy-move manipulation identification
7. **Noise Distribution**: Texture naturalness analysis
8. **String Extraction**: Embedded software signature detection
9. **Region Quality**: Localized manipulation detection

### Investigation Modes

**General Mode**: Balanced forensic analysis for comprehensive manipulation detection

**Insurance Mode**: Prioritizes license plate, damage region, and reflection analysis for claims verification

**Customer Care Mode**: Focuses on foreign object detection, label integrity, and container state for complaint verification

### Chain of Custody
- Complete audit logging of all system actions
- Analysis trace showing AI agent's decision-making process
- SHA-256 hash generation for evidence integrity
- ISO timestamp recording for acquisition time

### Reporting
- Executive summary generation using fine-tuned forensic LLM
- Mode-specific verdict synthesis
- PDF export with complete technical findings
- Chain-of-thought timeline visualization

## Technology Stack

- **Frontend**: React 19.2.3 + TypeScript
- **AI**: Fine-tuned multimodal LLM (based on Gemini architecture)
- **Image Processing**: Canvas API for client-side ELA and noise analysis
- **Metadata**: exifr 7.1.3 for EXIF parsing
- **Maps**: Leaflet 1.9.4 for GPS visualization
- **PDF**: jsPDF 2.5.1 for report generation
- **Icons**: Lucide React 0.562.0
- **Build**: Vite 6.2.0

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- API key for the fine-tuned forensic LLM model


## Usage

### Basic Workflow

1. **Select Investigation Mode**: Choose between General, Insurance, or Customer Care mode in Settings
2. **Upload Evidence**: Drag and drop an image file or click to browse
3. **Automatic Analysis**: The Supervisor Agent will automatically orchestrate forensic tests
4. **Review Results**: View real-time progress and analysis results for each node
5. **Generate Report**: Export comprehensive PDF report with findings

### Investigation Modes

**General Mode**:
- Use for comprehensive forensic analysis
- Balanced approach across all detection methods
- Suitable for general manipulation detection

**Insurance Mode**:
- Optimized for vehicle/property damage claims
- Prioritizes license plate and damage region analysis
- Detects inpainting and reflection inconsistencies

**Customer Care Mode**:
- Designed for e-commerce/delivery complaints
- Focuses on foreign object and label integrity
- Identifies pasted objects and container state issues

### Configuring Scoring Weights

Navigate to Settings to customize the weight of each analysis node:
- Deepfake Detection: 0.2 (default)
- Region Quality: 0.2 (default)
- DCT Analysis: 0.1 (default)
- PRNU: 0.1 (default)
- Clone Detection: 0.1 (default)
- ELA: 0.1 (default)
- Noise: 0.1 (default)
- Lighting: 0.05 (default)
- Strings: 0.05 (default)

### Case History

- View past investigations in the History tab
- Search by case ID or file hash
- Filter by risk level, camera model, or date range
- Load historical cases for review
- Separate history databases for each investigation mode

## Architecture

### Client-Side Processing
All image processing occurs in the browser:
- No server uploads required
- Privacy-focused design
- ELA calculation via Canvas API
- Noise variance analysis
- String extraction from file bytes

### AI Integration
- Single global analysis call to fine-tuned vision model
- Structured JSON responses
- Mode-specific prompts optimized for forensic analysis
- Graceful degradation on API failures

### State Management
- Race condition prevention via unique run IDs
- Separate case histories per investigation mode
- Real-time progress updates
- Audit log and analysis trace recording

## Security & Privacy

- All processing occurs client-side (no server uploads)
- Image data sent only to fine-tuned LLM API endpoint
- No persistent storage (case history stored in browser memory only)
- API key stored securely in environment variables
- File type validation and input sanitization

## Browser Compatibility

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

## Build for Production

```bash
npm run build
```

The production build will be created in the `dist/` directory. Deploy this folder to any static hosting service.

## Project Structure

```
kshura-forensic-agent/
├── components/           # React UI components
│   ├── AuditLog.tsx     # Audit log panel
│   ├── MapPreview.tsx   # GPS map visualization
│   ├── NavBar.tsx       # Navigation bar
│   ├── NodeCard.tsx     # Analysis node display
│   └── ReportView.tsx   # Report generation and PDF export
├── services/            # Core services
│   ├── forensicSimulator.ts  # Client-side signal processing
│   └── geminiService.ts      # Gemini AI integration
├── App.tsx              # Main application component
├── types.ts             # TypeScript type definitions
├── index.tsx            # Application entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies and scripts
```

## Performance

**Benchmarks**:
- ELA calculation: < 2 seconds for 4K images
- Noise calculation: < 1 second for 4K images
- String extraction: < 500ms for 10MB files
- PDF generation: < 3 seconds for complete reports

## Limitations

- Single-user application (no backend)
- No case history persistence (lost on browser refresh)
- Limited to browser memory constraints
- Sequential node processing only

## Future Enhancements

- Persistent storage with IndexedDB
- Batch processing for multiple images
- Per-mode weight configurations
- Advanced visualizations (ELA heatmaps, clone detection overlays)
- JSON/CSV export formats
- Side-by-side image comparison
- Plugin system for custom analysis nodes
- Web Workers for parallel processing

## Documentation

For detailed technical documentation, see:
- [Requirements Document](.kiro/specs/forensic-image-analysis/requirements.md)
- [Design Document](.kiro/specs/forensic-image-analysis/design.md)
- [Implementation Tasks](.kiro/specs/forensic-image-analysis/tasks.md)

## Acknowledgments

- Fine-tuned multimodal LLM for forensic image analysis
- exifr library for EXIF metadata parsing
- Leaflet for interactive maps
- jsPDF for PDF generation
