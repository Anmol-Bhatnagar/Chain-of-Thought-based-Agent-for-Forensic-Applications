# Requirements Document

## Introduction

Kshura Forensics is an autonomous AI-powered forensic image analysis application designed to detect image manipulation, deepfakes, and fraud across multiple investigation contexts. The system leverages Google Gemini AI for visual analysis combined with client-side signal processing to provide comprehensive forensic reports with chain-of-custody audit trails.

## Glossary

- **System**: The Kshura Forensics application
- **Forensic_Case**: A complete investigation record including metadata, analysis results, and audit logs
- **Analysis_Node**: An individual forensic test (e.g., deepfake detection, DCT analysis)
- **Supervisor_Agent**: The AI agent that dynamically decides which analysis nodes to execute
- **Investigation_Mode**: The operational context (general, insurance, customer_care)
- **Audit_Log**: Timestamped record of all system actions for chain of custody
- **Analysis_Trace**: Chain-of-thought record showing the Supervisor Agent's decision-making process
- **Risk_Level**: Classification of findings (LOW, MEDIUM, HIGH, CRITICAL)
- **Authenticity_Score**: Weighted score from 0-100 indicating image authenticity (100 = authentic)
- **EXIF_Metadata**: Embedded image metadata including camera model, GPS, software
- **ELA**: Error Level Analysis - technique to detect JPEG compression inconsistencies
- **DCT**: Discrete Cosine Transform - analysis of JPEG compression artifacts
- **PRNU**: Photo Response Non-Uniformity - sensor noise fingerprinting
- **Clone_Detection**: Identification of copy-move manipulation
- **Gemini_Vision**: Google's multimodal AI model for image analysis

## Requirements

### Requirement 1: Image Upload and Acquisition

**User Story:** As a forensic investigator, I want to upload digital evidence images, so that I can initiate forensic analysis with proper chain of custody.

#### Acceptance Criteria

1. WHEN a user drags and drops an image file onto the upload zone, THE System SHALL accept the file and initiate investigation
2. WHEN a user clicks the upload button, THE System SHALL open a file browser for image selection
3. WHEN a non-image file is uploaded, THE System SHALL reject the file and display an error message
4. WHEN an image is uploaded, THE System SHALL generate a SHA-256 hash for chain of custody
5. WHEN an image is uploaded, THE System SHALL record the acquisition timestamp in ISO format
6. WHEN an investigation is in progress, THE System SHALL prevent new uploads until the current investigation completes

### Requirement 2: Investigation Mode Selection

**User Story:** As a forensic investigator, I want to select different investigation modes, so that the analysis is optimized for my specific use case.

#### Acceptance Criteria

1. THE System SHALL support three investigation modes: general, insurance, and customer_care
2. WHEN a user changes the investigation mode, THE System SHALL reset the current investigation if data exists
3. WHEN a user changes the investigation mode, THE System SHALL prompt for confirmation before resetting
4. WHEN a mode is selected, THE System SHALL configure the Supervisor Agent with mode-specific priorities
5. WHERE insurance mode is active, THE System SHALL prioritize license plate and damage region analysis
6. WHERE customer_care mode is active, THE System SHALL prioritize foreign object and label integrity analysis
7. WHERE general mode is active, THE System SHALL perform balanced forensic analysis

### Requirement 3: Metadata Extraction

**User Story:** As a forensic investigator, I want to extract and display image metadata, so that I can verify the image's origin and capture details.

#### Acceptance Criteria

1. WHEN an image is uploaded, THE System SHALL extract EXIF metadata including camera model, software, and capture date
2. WHEN an image is uploaded, THE System SHALL extract GPS coordinates if present
3. WHEN GPS coordinates are extracted, THE System SHALL display the location on an interactive map
4. WHEN GPS coordinates are extracted, THE System SHALL reverse-geocode to obtain a location name
5. WHEN metadata extraction fails, THE System SHALL continue analysis with available data
6. WHEN editing software is detected in metadata, THE System SHALL flag it as a warning in the audit log

### Requirement 4: Autonomous Analysis Orchestration

**User Story:** As a forensic investigator, I want an AI agent to dynamically decide which forensic tests to run, so that analysis is efficient and context-aware.

#### Acceptance Criteria

1. WHEN an investigation starts, THE Supervisor_Agent SHALL analyze the image with Gemini Vision
2. WHEN global analysis completes, THE Supervisor_Agent SHALL iteratively select the next analysis node to execute
3. WHEN selecting the next node, THE Supervisor_Agent SHALL consider completed node results and investigation mode
4. WHEN a CRITICAL risk is detected, THE Supervisor_Agent SHALL have the option to conclude the investigation early
5. WHEN all nodes are completed, THE Supervisor_Agent SHALL conclude the investigation
6. WHEN the Supervisor_Agent makes a decision, THE System SHALL record the reasoning in the analysis trace
7. THE System SHALL execute a maximum of 9 analysis node iterations per investigation

### Requirement 5: Deepfake Detection Analysis

**User Story:** As a forensic investigator, I want to detect AI-generated or deepfake content, so that I can identify synthetic images.

#### Acceptance Criteria

1. WHEN the deepfake node executes, THE System SHALL analyze the image using Gemini Vision for AI generation artifacts
2. WHEN the deepfake node executes, THE System SHALL calculate probability scores for real vs fake classification
3. WHEN the deepfake node completes, THE System SHALL assign a risk level based on the fake probability
4. WHEN the fake probability exceeds 80%, THE System SHALL assign CRITICAL risk level
5. WHEN the fake probability is between 50% and 80%, THE System SHALL assign HIGH risk level
6. WHEN the deepfake node completes, THE System SHALL provide an inference explaining the findings

### Requirement 6: DCT Compression Analysis

**User Story:** As a forensic investigator, I want to detect double JPEG compression, so that I can identify re-saved or edited images.

#### Acceptance Criteria

1. WHEN the DCT node executes, THE System SHALL analyze the image for compression artifacts using Gemini Vision
2. WHEN the DCT node executes, THE System SHALL check metadata for editing software signatures
3. WHEN visual blockiness is detected, THE System SHALL reduce the authenticity score
4. WHEN editing software is detected in metadata, THE System SHALL reduce the authenticity score
5. WHEN the DCT node completes, THE System SHALL assign HIGH risk if the score is below 50

### Requirement 7: PRNU Sensor Noise Analysis

**User Story:** As a forensic investigator, I want to analyze sensor noise patterns, so that I can detect inconsistent noise indicating manipulation.

#### Acceptance Criteria

1. WHEN the PRNU node executes, THE System SHALL analyze noise consistency using Gemini Vision
2. WHEN noise patterns are consistent, THE System SHALL assign a score of 90 or higher
3. WHEN noise patterns are inconsistent, THE System SHALL assign a score of 40 or lower and HIGH risk level
4. WHEN the PRNU node completes, THE System SHALL provide an inference about noise pattern findings

### Requirement 8: Error Level Analysis (ELA)

**User Story:** As a forensic investigator, I want to perform error level analysis, so that I can detect regions with different compression levels.

#### Acceptance Criteria

1. WHEN the ELA node executes, THE System SHALL perform client-side ELA calculation by re-compressing the image
2. WHEN the ELA node executes, THE System SHALL calculate error variance across the image
3. WHEN error variance is below 1.5, THE System SHALL assign HIGH risk and score of 30
4. WHEN error variance exceeds 15, THE System SHALL assign MEDIUM risk and score of 60
5. WHEN error variance is within normal range, THE System SHALL assign LOW risk and score of 90

### Requirement 9: Lighting Consistency Analysis

**User Story:** As a forensic investigator, I want to analyze scene lighting, so that I can detect inconsistent shadows or light sources indicating compositing.

#### Acceptance Criteria

1. WHEN the lighting node executes, THE System SHALL analyze lighting consistency using Gemini Vision
2. WHEN lighting is consistent, THE System SHALL assign a score of 95 and LOW risk level
3. WHEN lighting is inconsistent, THE System SHALL assign a score of 45 and HIGH risk level
4. WHEN the lighting node completes, THE System SHALL report the number of detected light sources

### Requirement 10: Clone Detection Analysis

**User Story:** As a forensic investigator, I want to detect cloned regions, so that I can identify copy-move manipulation.

#### Acceptance Criteria

1. WHEN the clone node executes, THE System SHALL analyze the image for duplicated regions using Gemini Vision
2. WHEN cloned regions are detected, THE System SHALL assign CRITICAL risk level and score of 20
3. WHEN no cloned regions are detected, THE System SHALL assign LOW risk level and score of 100
4. WHEN the clone node completes, THE System SHALL report the number of cloned regions found

### Requirement 11: Noise Distribution Analysis

**User Story:** As a forensic investigator, I want to analyze noise distribution, so that I can detect unnatural smoothness from AI generation or denoising.

#### Acceptance Criteria

1. WHEN the noise node executes, THE System SHALL perform client-side noise variance calculation
2. WHEN noise standard deviation is below 10, THE System SHALL assign HIGH risk and score of 40
3. WHEN noise standard deviation is within normal range, THE System SHALL assign LOW risk and score of 90
4. WHEN the noise node completes, THE System SHALL provide an inference about texture naturalness

### Requirement 12: String Extraction and Analysis

**User Story:** As a forensic investigator, I want to extract embedded strings from image files, so that I can detect editing software signatures.

#### Acceptance Criteria

1. WHEN the strings node executes, THE System SHALL extract readable ASCII strings from the image file bytes
2. WHEN the strings node executes, THE System SHALL analyze extracted strings using Gemini Vision
3. WHEN editing software signatures are found, THE System SHALL assign HIGH risk and score of 30
4. WHEN no suspicious signatures are found, THE System SHALL assign LOW risk and score of 100
5. WHEN the strings node completes, THE System SHALL report up to 5 significant extracted strings

### Requirement 13: Region Quality Analysis

**User Story:** As a forensic investigator, I want to analyze specific image regions for quality anomalies, so that I can detect localized manipulation.

#### Acceptance Criteria

1. WHEN the region quality node executes, THE System SHALL analyze multiple image regions using Gemini Vision
2. WHEN the region quality node executes, THE System SHALL identify issues such as pixelation, smoothness, blurring, or artifacts
3. WHEN the region quality node executes, THE System SHALL assign a risk score to each analyzed region
4. WHEN the average region risk exceeds 70, THE System SHALL assign CRITICAL risk level
5. WHEN the average region risk is between 40 and 70, THE System SHALL assign HIGH risk level
6. WHEN the region quality node completes, THE System SHALL calculate an overall quality score

### Requirement 14: Weighted Scoring System

**User Story:** As a forensic investigator, I want to configure scoring weights for different analysis nodes, so that I can prioritize certain tests based on my investigation needs.

#### Acceptance Criteria

1. THE System SHALL maintain configurable weights for each analysis node
2. THE System SHALL use default weights: deepfake (0.2), region_quality (0.2), dct (0.1), prnu (0.1), clone (0.1), ela (0.1), noise (0.1), lighting (0.05), strings (0.05)
3. WHEN calculating the final score, THE System SHALL only include completed nodes in the weighted average
4. WHEN calculating the final score, THE System SHALL normalize the total if some nodes were skipped
5. WHEN a user modifies weights in settings, THE System SHALL apply the new weights to future investigations
6. WHEN weights are modified, THE System SHALL validate that they are non-negative numbers

### Requirement 15: Final Report Generation

**User Story:** As a forensic investigator, I want to generate a comprehensive forensic report, so that I can document my findings with executive summary and technical details.

#### Acceptance Criteria

1. WHEN all analysis completes, THE System SHALL generate an executive summary using Gemini AI
2. WHEN generating the report, THE System SHALL synthesize findings from all completed nodes
3. WHEN generating the report, THE System SHALL provide agent reasoning explaining the verdict
4. WHEN generating the report, THE System SHALL tailor the summary to the investigation mode
5. WHERE insurance mode is active, THE System SHALL address claim validity in the summary
6. WHERE customer_care mode is active, THE System SHALL address complaint authenticity in the summary
7. WHEN the report is generated, THE System SHALL display it in a formatted view with chain-of-thought trace

### Requirement 16: PDF Report Export

**User Story:** As a forensic investigator, I want to export reports as PDF documents, so that I can share findings with stakeholders.

#### Acceptance Criteria

1. WHEN a user clicks the export PDF button, THE System SHALL generate a PDF document
2. WHEN generating the PDF, THE System SHALL include case ID, hash, mode, device, and score
3. WHEN generating the PDF, THE System SHALL include the executive summary
4. WHEN generating the PDF, THE System SHALL include technical findings from all completed nodes
5. WHEN generating the PDF, THE System SHALL include the supervisor agent's chain-of-thought trace
6. WHEN generating the PDF, THE System SHALL include the final synthesis reasoning
7. WHEN generating the PDF, THE System SHALL add page numbers and timestamps
8. WHEN the PDF is generated, THE System SHALL download it with filename format: Kshura_Report_{caseId}.pdf

### Requirement 17: Audit Log Management

**User Story:** As a forensic investigator, I want a detailed audit log of all system actions, so that I can maintain chain of custody for legal proceedings.

#### Acceptance Criteria

1. WHEN any system action occurs, THE System SHALL create an audit log entry with timestamp, action, details, and status
2. WHEN an audit log entry is created, THE System SHALL display it in real-time in the audit log panel
3. WHEN new log entries are added, THE System SHALL auto-scroll to the latest entry
4. WHEN a user toggles the audit log panel, THE System SHALL expand or collapse the panel
5. WHEN the audit log panel is open, THE System SHALL allow resizing between 240px and 600px width
6. THE System SHALL use color-coded icons for log status: success (green), warning (amber), error (red), info (cyan)

### Requirement 18: Analysis Trace Recording

**User Story:** As a forensic investigator, I want to see the AI agent's decision-making process, so that I can understand why certain tests were prioritized.

#### Acceptance Criteria

1. WHEN the Supervisor_Agent makes a decision, THE System SHALL record it as an analysis trace step
2. WHEN recording a trace step, THE System SHALL include order, timestamp, type, title, detail, and optional risk level
3. THE System SHALL support three trace step types: PLAN, EXECUTION, and FINDING
4. WHEN displaying the analysis trace, THE System SHALL show steps in chronological order
5. WHEN displaying the analysis trace, THE System SHALL use visual indicators for step types
6. WHEN the analysis trace is included in reports, THE System SHALL format it as a timeline

### Requirement 19: Case History Management

**User Story:** As a forensic investigator, I want to maintain separate case histories for each investigation mode, so that I can review past cases by context.

#### Acceptance Criteria

1. THE System SHALL maintain three separate case history databases: one for each investigation mode
2. WHEN an investigation completes, THE System SHALL save the case to the active mode's history
3. WHEN a user switches to the history tab, THE System SHALL display cases from the current mode's history
4. WHEN a user clicks on a historical case, THE System SHALL load the complete case data
5. WHEN loading a historical case, THE System SHALL prevent loading if an investigation is in progress
6. WHEN displaying history, THE System SHALL show cases in reverse chronological order (newest first)

### Requirement 20: Case Search and Filtering

**User Story:** As a forensic investigator, I want to search and filter case history, so that I can quickly find specific investigations.

#### Acceptance Criteria

1. WHEN a user enters a search query, THE System SHALL filter cases by case ID or file hash
2. WHEN a user selects a risk filter, THE System SHALL filter cases by calculated risk level
3. WHEN a user enters a camera filter, THE System SHALL filter cases by camera model metadata
4. WHEN a user sets a date range, THE System SHALL filter cases by acquisition timestamp
5. WHEN multiple filters are active, THE System SHALL apply all filters using AND logic
6. WHEN filters are cleared, THE System SHALL display all cases from the current mode's history

### Requirement 21: New Case Initialization

**User Story:** As a forensic investigator, I want to start a new case, so that I can clear the current investigation and begin fresh analysis.

#### Acceptance Criteria

1. WHEN a user clicks the new case button, THE System SHALL check if an investigation is in progress
2. WHEN an investigation is in progress, THE System SHALL prompt for confirmation before resetting
3. WHEN the user confirms, THE System SHALL terminate the current investigation process
4. WHEN starting a new case, THE System SHALL reset all analysis nodes to idle state
5. WHEN starting a new case, THE System SHALL clear the audit log and analysis trace
6. WHEN starting a new case, THE System SHALL generate a new case ID

### Requirement 22: Settings Management

**User Story:** As a forensic investigator, I want to configure investigation mode and scoring weights, so that I can customize the system for my workflow.

#### Acceptance Criteria

1. WHEN a user opens the settings tab, THE System SHALL display current mode and weight configurations
2. WHEN a user modifies settings, THE System SHALL track pending changes separately from active settings
3. WHEN a user clicks save settings, THE System SHALL validate the changes
4. WHEN mode is changed, THE System SHALL prompt for confirmation if active data exists
5. WHEN settings are saved, THE System SHALL apply the new configuration
6. WHEN settings are saved, THE System SHALL display a visual confirmation
7. WHEN no changes are made, THE System SHALL disable the save button

### Requirement 23: Real-Time Processing Feedback

**User Story:** As a forensic investigator, I want to see real-time progress during analysis, so that I understand what the system is doing.

#### Acceptance Criteria

1. WHEN an investigation is in progress, THE System SHALL display the current processing step
2. WHEN an analysis node is processing, THE System SHALL display a processing indicator on the node card
3. WHEN an analysis node completes, THE System SHALL update the node card with results
4. WHEN the Supervisor_Agent is deciding, THE System SHALL display "Agent Deciding Next Step"
5. WHEN processing is active, THE System SHALL disable upload and new case buttons
6. WHEN processing completes, THE System SHALL re-enable all controls

### Requirement 24: Node Result Visualization

**User Story:** As a forensic investigator, I want to see visual representations of analysis results, so that I can quickly assess findings.

#### Acceptance Criteria

1. WHEN a node completes, THE System SHALL display the node's risk level with color coding
2. WHEN a node completes, THE System SHALL display the authenticity score prominently
3. WHEN a node completes, THE System SHALL display the inference text
4. WHERE the deepfake node completes, THE System SHALL display a probability bar chart
5. WHERE the DCT or noise node completes, THE System SHALL display consistency and variance metrics
6. WHERE the clone node completes, THE System SHALL display feature match count
7. WHEN a node has CRITICAL or HIGH risk, THE System SHALL use red color scheme and pulsing animation

### Requirement 25: Race Condition Prevention

**User Story:** As a forensic investigator, I want the system to handle interruptions gracefully, so that starting a new case doesn't corrupt ongoing analysis.

#### Acceptance Criteria

1. WHEN an investigation starts, THE System SHALL generate a unique run ID
2. WHEN state updates occur, THE System SHALL verify the run ID matches the active investigation
3. WHEN a new case is started during processing, THE System SHALL invalidate the previous run ID
4. WHEN a run ID is invalidated, THE System SHALL ignore all subsequent state updates from that run
5. WHEN switching investigation modes, THE System SHALL invalidate any active run ID

### Requirement 26: Responsive Layout

**User Story:** As a forensic investigator, I want the interface to work on different screen sizes, so that I can use the system on various devices.

#### Acceptance Criteria

1. WHEN the viewport is below 1024px, THE System SHALL stack metadata and map sections vertically
2. WHEN the viewport is below 768px, THE System SHALL display analysis nodes in a single column
3. WHEN the viewport is below 640px, THE System SHALL adjust header layout to vertical stacking
4. THE System SHALL maintain readability and usability across all supported viewport sizes

### Requirement 27: Error Handling

**User Story:** As a forensic investigator, I want clear error messages when issues occur, so that I can understand and resolve problems.

#### Acceptance Criteria

1. WHEN Gemini API key is missing, THE System SHALL log an error and continue with available analysis
2. WHEN Gemini API calls fail, THE System SHALL log the error and provide fallback analysis
3. WHEN metadata extraction fails, THE System SHALL log a warning and continue with available data
4. WHEN file reading fails, THE System SHALL display an error message to the user
5. WHEN JSON parsing fails, THE System SHALL log the error and use fallback values
6. WHEN an analysis node fails, THE System SHALL log the error and continue with remaining nodes
