# Implementation Plan: Forensic Image Analysis

## Overview

This implementation plan outlines the construction of the Kshura Forensics application, an autonomous AI-powered forensic image analysis system. The implementation follows a layered approach: core data structures and utilities first, then service layer, followed by UI components, and finally integration and testing.

## Tasks

- [ ] 1. Set up project structure and core types
  - Initialize React + TypeScript + Vite project
  - Install dependencies: @google/genai, exifr, jspdf, leaflet, lucide-react, recharts
  - Create types.ts with all TypeScript interfaces
  - Configure environment variables for Gemini API key
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 2. Implement core utility functions
  - [ ] 2.1 Implement SHA-256 hash generation
    - Create generateHash function using Web Crypto API
    - Handle both File objects and fallback for missing files
    - _Requirements: 1.4_
  
  - [ ]* 2.2 Write property test for hash generation
    - **Property 3: SHA-256 Hash Generation**
    - **Validates: Requirements 1.4**
  
  - [ ] 2.3 Implement file-to-base64 conversion
    - Create fileToBase64 function using FileReader API
    - Strip data URL prefix for Gemini API compatibility
    - _Requirements: 4.1_
  
  - [ ] 2.4 Implement image loading utility
    - Create loadImage function that returns HTMLImageElement
    - Use URL.createObjectURL for efficient loading
    - _Requirements: 3.1, 8.1_

- [ ] 3. Implement metadata extraction service
  - [ ] 3.1 Create extractMetadata function
    - Use exifr library to parse EXIF data
    - Extract camera model, software, capture date, GPS coordinates
    - Implement fallback for missing or corrupted EXIF data
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [ ]* 3.2 Write property test for metadata extraction
    - **Property 8: EXIF Metadata Extraction**
    - **Validates: Requirements 3.1**
  
  - [ ]* 3.3 Write property test for GPS extraction
    - **Property 9: GPS Coordinate Extraction**
    - **Validates: Requirements 3.2**
  
  - [ ]* 3.4 Write property test for graceful failure
    - **Property 10: Graceful Metadata Failure**
    - **Validates: Requirements 3.5**

- [ ] 4. Implement client-side signal processing
  - [ ] 4.1 Implement Error Level Analysis (ELA)
    - Create calculateELA function using Canvas API
    - Resize image to max 800px for performance
    - Re-compress at 90% quality and calculate pixel differences
    - _Requirements: 8.1, 8.2_
  
  - [ ] 4.2 Implement noise variance calculation
    - Create calculateNoise function using Canvas API
    - Resize to 512x512 for consistent analysis
    - Calculate grayscale variance as noise metric
    - _Requirements: 11.1_
  
  - [ ] 4.3 Implement string extraction from file bytes
    - Create extractFileStrings function
    - Scan file bytes for printable ASCII strings (length >= 4)
    - Filter for interesting keywords (Adobe, Photoshop, GIMP, etc.)
    - Limit to first 1MB and max 40 strings for performance
    - _Requirements: 12.1_
  
  - [ ]* 4.4 Write unit tests for signal processing
    - Test ELA with known compressed images
    - Test noise calculation with synthetic images
    - Test string extraction with crafted file bytes
    - _Requirements: 8.1, 11.1, 12.1_

- [ ] 5. Implement Gemini AI service
  - [ ] 5.1 Create Gemini client initialization
    - Implement getGeminiClient function
    - Handle missing API key gracefully
    - _Requirements: 4.1, 27.1_
  
  - [ ] 5.2 Implement mode-specific analysis prompts
    - Create getAnalysisPrompt function with three mode variants
    - General mode: Comprehensive forensic analysis
    - Insurance mode: License plate and damage focus
    - Customer care mode: Foreign object and label focus
    - Include extracted strings in prompt context
    - _Requirements: 2.4, 2.5, 2.6, 2.7_
  
  - [ ] 5.3 Implement analyzeImageWithGemini function
    - Send base64 image with mode-specific prompt
    - Request structured JSON response
    - Parse response into GeminiAnalysisResult
    - Handle API errors with null return
    - _Requirements: 4.1, 5.1, 27.2_
  
  - [ ]* 5.4 Write property test for Gemini invocation
    - **Property 12: Gemini Vision Analysis Invocation**
    - **Validates: Requirements 4.1**
  
  - [ ] 5.5 Implement Supervisor Agent decision function
    - Create getNextInvestigationStep function
    - Pass metadata, completed nodes, available nodes, and mode
    - Use mode-specific persona instructions
    - Return next node or FINISH decision with reasoning
    - Handle API errors with fallback to sequential execution
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 5.6 Write property test for agent context
    - **Property 14: Agent Context Completeness**
    - **Validates: Requirements 4.3**
  
  - [ ] 5.7 Implement report generation function
    - Create generateForensicReport function
    - Synthesize findings from all completed nodes
    - Use mode-specific persona for report generation
    - Return executive summary and agent reasoning
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_
  
  - [ ]* 5.8 Write property test for report completeness
    - **Property 25: Report Completeness**
    - **Validates: Requirements 15.2, 15.3**

- [ ] 6. Checkpoint - Ensure service layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement global analysis orchestration
  - [ ] 7.1 Create startGlobalAnalysis function
    - Parallel execution of: ELA, noise, base64 conversion, string extraction
    - Call analyzeImageWithGemini with all context
    - Return GlobalAnalysisContext with all results
    - _Requirements: 4.1_
  
  - [ ]* 7.2 Write integration test for global analysis
    - Test with sample image file
    - Verify all context fields are populated
    - _Requirements: 4.1_

- [ ] 8. Implement analysis node runners
  - [ ] 8.1 Implement runDeepfakeNode
    - Extract deepfake data from Gemini result
    - Calculate adjusted probability using global tamper score
    - Assign risk level based on fake probability thresholds
    - Return NodeResult with score, risk, inference, and data
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ] 8.2 Implement runDCTNode
    - Check for visual artifacts from Gemini result
    - Check metadata for editing software
    - Calculate score based on findings
    - Assign risk level based on score
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 8.3 Implement runPRNUNode
    - Extract noise consistency from Gemini result
    - Assign score and risk based on consistency
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 8.4 Implement runELANode
    - Use client-side ELA score from context
    - Apply threshold logic: < 1.5 (HIGH), > 15 (MEDIUM), else (LOW)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 8.5 Implement runLightingNode
    - Extract lighting consistency from Gemini result
    - Assign score and risk based on consistency
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 8.6 Implement runCloneNode
    - Extract clone detection from Gemini result
    - Assign CRITICAL risk if clones detected, LOW otherwise
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 8.7 Implement runNoiseNode
    - Use client-side noise score from context
    - Apply threshold logic: < 10 (HIGH), else (LOW)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [ ] 8.8 Implement runStringsNode
    - Extract string analysis from Gemini result
    - Check local strings for suspicious keywords
    - Combine Gemini and local analysis
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [ ] 8.9 Implement runRegionQualityNode
    - Extract region analysis from Gemini result
    - Calculate average risk score across regions
    - Assign overall risk level based on average
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_
  
  - [ ]* 8.10 Write property test for node score validity
    - **Property 19: Node Score Validity**
    - **Validates: Requirements 5.2, 6.1-6.5, 7.1-7.4, 8.1-8.5, 9.1-9.4, 10.1-10.4, 11.1-11.4, 12.1-12.5, 13.1-13.6**
  
  - [ ]* 8.11 Write property test for risk level assignment
    - **Property 20: Risk Level Assignment**
    - **Validates: Requirements 5.3, 5.4, 5.5**

- [ ] 9. Implement main application state and orchestration
  - [ ] 9.1 Create App.tsx with initial state structure
    - Define initialCaseState with all nodes
    - Define DEFAULT_WEIGHTS for scoring
    - Set up state hooks: caseData, history, selectedMode, scoringWeights
    - Set up UI state: activeTab, isProcessing, auditLogWidth, isAuditLogOpen
    - Set up activeRunIdRef for race condition prevention
    - _Requirements: 1.1, 2.1, 14.2, 25.1_
  
  - [ ] 9.2 Implement audit log helper function
    - Create addLog function that appends to caseData.auditLog
    - Include timestamp, action, details, and status
    - _Requirements: 17.1_
  
  - [ ]* 9.3 Write property test for audit log creation
    - **Property 27: Audit Log Entry Creation**
    - **Validates: Requirements 17.1**
  
  - [ ] 9.3 Implement analysis trace helper function
    - Create addTraceStep function that appends to caseData.analysisTrace
    - Include order, timestamp, type, title, detail, and optional risk
    - _Requirements: 18.1, 18.2_
  
  - [ ]* 9.4 Write property test for trace entry structure
    - **Property 28: Trace Entry Structure**
    - **Validates: Requirements 18.2**

- [ ] 10. Implement file upload handlers
  - [ ] 10.1 Implement drag-and-drop handlers
    - handleDragOver: Prevent default and set isDragging
    - handleDragLeave: Clear isDragging
    - handleDrop: Extract file, validate type, call startInvestigation
    - _Requirements: 1.1, 1.3_
  
  - [ ] 10.2 Implement file input handler
    - handleFileSelect: Extract file from input, call startInvestigation
    - triggerFileUpload: Programmatically click hidden file input
    - _Requirements: 1.1_
  
  - [ ]* 10.3 Write property test for non-image rejection
    - **Property 2: Non-Image File Rejection**
    - **Validates: Requirements 1.3**
  
  - [ ]* 10.4 Write property test for upload prevention
    - **Property 5: Upload Prevention During Processing**
    - **Validates: Requirements 1.6**

- [ ] 11. Implement core investigation orchestration
  - [ ] 11.1 Create startInvestigation function skeleton
    - Generate unique runId and set activeRunIdRef
    - Set isProcessing flag
    - Initialize case with new ID and selected mode
    - Create local mutable state reference
    - Define updateState, updateNodeState, addTraceStep helpers with runId validation
    - _Requirements: 1.1, 25.1, 25.2_
  
  - [ ] 11.2 Implement Step 1: Initialization
    - Log case creation with mode
    - Add trace step for investigation initialized
    - Log file upload details
    - Generate SHA-256 hash
    - Record acquisition timestamp
    - _Requirements: 1.4, 1.5, 17.1, 18.1_
  
  - [ ]* 11.3 Write property test for ISO timestamp
    - **Property 4: ISO Timestamp Format**
    - **Validates: Requirements 1.5**
  
  - [ ] 11.4 Implement Step 2: Metadata extraction
    - Call extractMetadata
    - Update state with metadata
    - Add trace step for metadata extracted
    - Log metadata findings with warning for editing software
    - _Requirements: 3.1, 3.2, 3.6_
  
  - [ ]* 11.5 Write property test for editing software warning
    - **Property 11: Editing Software Warning**
    - **Validates: Requirements 3.6**
  
  - [ ] 11.6 Implement Step 3: Global analysis
    - Log agent execution start
    - Call startGlobalAnalysis with file and mode
    - Handle errors with try-catch
    - Log data acquisition success
    - _Requirements: 4.1, 27.2_
  
  - [ ] 11.7 Implement Step 4: Dynamic execution loop
    - Create nodeRunners map with all 9 node functions
    - Initialize completedNodeKeys set and iteration counter
    - Loop while iterations < 9 and available nodes exist
    - Build completed summary for agent
    - Call getNextInvestigationStep
    - Handle FINISH decision
    - Execute selected node with status updates
    - Add trace steps for plan and findings
    - Increment iteration counter
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 11.8 Write property test for iteration bound
    - **Property 18: Maximum Iteration Bound**
    - **Validates: Requirements 4.7**
  
  - [ ]* 11.9 Write property test for investigation conclusion
    - **Property 16: Investigation Conclusion**
    - **Validates: Requirements 4.5**
  
  - [ ] 11.10 Implement Step 5: Weighted scoring
    - Iterate through completed nodes
    - Apply configured weights to each node score
    - Calculate weighted sum and total weight
    - Normalize final score
    - Log scoring completion
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [ ]* 11.11 Write property test for weighted score calculation
    - **Property 22: Weighted Score Calculation**
    - **Validates: Requirements 14.3, 14.4**
  
  - [ ] 11.12 Implement Step 6: Report synthesis
    - Call generateForensicReport with case data
    - Update state with final score, reasoning, and summary
    - Save case to mode-specific history
    - Log completion
    - Clear isProcessing flag
    - _Requirements: 15.1, 15.2, 15.3, 19.2_
  
  - [ ]* 11.13 Write property test for mode-specific history storage
    - **Property 30: Mode-Specific History Storage**
    - **Validates: Requirements 19.2**

- [ ] 12. Checkpoint - Ensure core orchestration works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement case management functions
  - [ ] 13.1 Implement handleNewCase
    - Check if processing is active
    - Prompt for confirmation if active
    - Invalidate activeRunIdRef
    - Reset caseData to initial state with selected mode
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 25.3_
  
  - [ ]* 13.2 Write property test for state reset
    - **Property 33: State Reset on New Case**
    - **Validates: Requirements 21.4, 21.5**
  
  - [ ] 13.3 Implement loadCase
    - Check if processing is active (reject if true)
    - Set caseData to selected historical case
    - Switch to home tab
    - _Requirements: 19.4, 19.5_
  
  - [ ] 13.4 Implement case search and filtering
    - Filter by search query (case ID or hash)
    - Filter by risk level (calculated from score)
    - Filter by camera model
    - Filter by date range
    - Apply all filters with AND logic
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [ ]* 13.5 Write property test for case search filtering
    - **Property 31: Case Search Filtering**
    - **Validates: Requirements 20.1**
  
  - [ ]* 13.6 Write property test for multi-filter AND logic
    - **Property 32: Multi-Filter AND Logic**
    - **Validates: Requirements 20.5**

- [ ] 14. Implement settings management
  - [ ] 14.1 Create settings state synchronization
    - Use useEffect to sync pendingMode and pendingWeights when entering settings tab
    - _Requirements: 22.1, 22.2_
  
  - [ ] 14.2 Implement handleSaveSettings
    - Detect mode changes and weight changes
    - Prompt for confirmation if mode changes with active data
    - Invalidate activeRunIdRef if mode changes during processing
    - Apply new mode and weights
    - Reset case data if mode changed
    - Show visual confirmation
    - _Requirements: 22.3, 22.4, 22.5, 22.6, 25.5_
  
  - [ ]* 14.3 Write property test for weight non-negativity
    - **Property 23: Weight Non-Negativity**
    - **Validates: Requirements 14.6**
  
  - [ ]* 14.4 Write property test for mode parameter propagation
    - **Property 7: Mode Parameter Propagation**
    - **Validates: Requirements 2.4**

- [ ] 15. Implement UI components
  - [ ] 15.1 Create NodeCard component
    - Display node name, status, risk level, score, inference
    - Show processing animation when status is 'processing'
    - Color-code by risk level (green/amber/red)
    - Display node-specific data visualizations
    - _Requirements: 23.2, 23.3, 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7_
  
  - [ ] 15.2 Create AuditLog component
    - Display audit log entries with timestamps
    - Color-coded status icons
    - Auto-scroll to latest entry
    - Collapsible sidebar
    - Resizable panel (240px - 600px)
    - _Requirements: 17.2, 17.3, 17.4, 17.5, 17.6_
  
  - [ ] 15.3 Create MapPreview component
    - Display interactive Leaflet map
    - Center on GPS coordinates
    - Add marker with location label
    - _Requirements: 3.3_
  
  - [ ] 15.4 Create ReportView component
    - Display executive summary
    - Display chain-of-thought timeline
    - Display technical findings from all nodes
    - Implement PDF export with jsPDF
    - Include all required sections in PDF
    - Generate filename with case ID
    - _Requirements: 15.7, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_
  
  - [ ]* 15.5 Write property test for PDF filename
    - **Property 26: PDF Export Filename**
    - **Validates: Requirements 16.8**
  
  - [ ] 15.6 Create NavBar component
    - Three tabs: Home, History, Settings
    - New Case button with confirmation
    - Display current mode badge
    - _Requirements: 21.1_

- [ ] 16. Implement main App.tsx views
  - [ ] 16.1 Implement renderHome view
    - Header with title, hash display, upload button
    - Drop zone for drag-and-drop upload
    - Metadata and map grid
    - Progress indicator during processing
    - Analysis nodes grid (9 NodeCard components)
    - ReportView when investigation completes
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 23.1, 23.4_
  
  - [ ] 16.2 Implement renderHistory view
    - Search input and filter controls
    - Display filtered case list
    - Click to load historical case
    - Show case count and mode badge
    - _Requirements: 19.3, 19.6, 20.1, 20.2, 20.3, 20.4_
  
  - [ ] 16.3 Implement renderSettings view
    - Mode selection radio buttons
    - Weight configuration inputs for all 9 nodes
    - Save button (disabled when no changes)
    - Visual confirmation on save
    - _Requirements: 22.1, 22.2, 22.3, 22.7_
  
  - [ ] 16.4 Implement main App return
    - NavBar component
    - AuditLog component (resizable sidebar)
    - Conditional rendering of active tab view
    - Hidden file input for upload
    - _Requirements: 17.2, 17.4, 17.5_

- [ ] 17. Implement responsive layout
  - [ ] 17.1 Add responsive CSS classes
    - Use Tailwind breakpoints: sm, md, lg, xl
    - Stack metadata/map vertically on < 1024px
    - Single column nodes on < 768px
    - Vertical header on < 640px
    - _Requirements: 26.1, 26.2, 26.3, 26.4_

- [ ] 18. Implement race condition prevention
  - [ ]* 18.1 Write property test for unique run ID generation
    - **Property 34: Unique Run ID Generation**
    - **Validates: Requirements 25.1**
  
  - [ ]* 18.2 Write property test for run ID validation
    - **Property 35: Run ID Validation**
    - **Validates: Requirements 25.2, 25.4**
  
  - [ ]* 18.3 Write property test for run ID invalidation
    - **Property 36: Run ID Invalidation**
    - **Validates: Requirements 25.3, 25.5**

- [ ] 19. Implement error handling
  - [ ]* 19.1 Write property test for graceful degradation
    - **Property 37: Error Handling Graceful Degradation**
    - **Validates: Requirements 27.1, 27.2, 27.3, 27.4, 27.5, 27.6**
  
  - [ ] 19.2 Add try-catch blocks to all async operations
    - Wrap Gemini API calls
    - Wrap metadata extraction
    - Wrap file reading operations
    - Log errors to audit log
    - Continue execution with fallback values
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6_

- [ ] 20. Integration testing and polish
  - [ ]* 20.1 Write end-to-end integration test
    - Test complete flow: upload → analysis → report → PDF export
    - Test mode switching with confirmation
    - Test historical case loading
    - Test search and filtering
    - _Requirements: All_
  
  - [ ] 20.2 Add loading states and animations
    - Processing animations on nodes
    - Scan line animation
    - Fade-in animations for results
    - Pulse animations for high-risk findings
    - _Requirements: 23.2, 23.3_
  
  - [ ] 20.3 Add accessibility features
    - ARIA labels for interactive elements
    - Keyboard navigation support
    - Focus management
    - Screen reader announcements
    - _Requirements: General best practices_
  
  - [ ] 20.4 Performance optimization
    - Memoize expensive calculations
    - Debounce search input
    - Lazy load map component
    - Optimize re-renders with React.memo
    - _Requirements: Performance considerations_

- [ ] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties across random inputs
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: utilities → services → components → integration
- Race condition prevention is critical and tested throughout
- Error handling ensures graceful degradation when external services fail
