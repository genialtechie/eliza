# @elizaos/plugin-job-search

A comprehensive job application assistant plugin for Eliza that helps users manage their job search process, from resume creation to application tracking.

## Features

### Resume Management

-   **Multi-Source Import**
    -   LinkedIn PDF/profile import
    -   PDF/Doc resume parsing
    -   Manual entry fallback via chat
-   **ATS Optimization**
    -   Format validation
    -   Keyword optimization
    -   Standard section verification
    -   No-graphics, ATS-friendly layout

### Job Application Tools

-   **Job Description Analysis**
    -   URL scraping support
    -   Text input processing
    -   Key requirements extraction
    -   Skills matching
-   **Document Generation**
    -   Tailored resumes
    -   Custom cover letters
    -   Cloud editor integration for major edits
-   **Match Scoring**
    -   Skills alignment percentage
    -   Missing skills identification
    -   Experience relevance scoring

### Application Tracking (Post-MVP)

-   **Status Management**
    -   One-click status updates
    -   Application timeline
    -   Status categories (Applied, No Response, Interviewing, Rejected, Accepted)
-   **Progress Overview**
    -   Application history
    -   Success metrics
    -   Follow-up reminders

### Auto Apply (Post-MVP)

-   **Automated Application**
    -   Job description analysis
    -   Resume matching
    -   Application submission
    -   Follow-up reminders

## Installation

```bash
pnpm add @elizaos/plugin-job-search
```

## Usage

### Basic Setup

```typescript
import { jobSearchPlugin } from "@elizaos/plugin-job-search";
import { createNodePlugin } from "@elizaos/plugin-node";

const runtime = new AgentRuntime({
    character: {
        name: "YourCharacterName",
        plugins: [new jobSearchPlugin(), createNodePlugin()],
    },
});
```

### Example Commands

```typescript
// Process resume
"Here's my resume" + [PDF attachment]

// Analyze job posting
"Check this job posting: [URL]"

// Generate tailored resume
"Create resume for this job posting"

// Generate cover letter
"Write cover letter for the job"

// Track application
"Mark job as applied"

// Update status
"Update job status to interviewing"
```

## Services

### ResumeService

Handles resume processing and optimization:

-   PDF parsing
-   LinkedIn resume data extraction from profile
-   ATS compatibility checks
-   Format standardization

### DocumentGenerationService

Creates tailored documents:

-   Resume customization
-   Cover letter generation
-   Cloud editor integration

### JobTrackingService (Post-MVP)

Manages application status and history:

-   Status updates
-   Application timeline
-   Progress tracking

## Actions

| Action                  | Description                   |
| ----------------------- | ----------------------------- |
| `process_resume`        | Parse and analyze resume      |
| `check_ats_compatibi..` | Check ATS compatibility       |
| `analyze_job`           | Extract job posting details   |
| `generate_resume`       | Create tailored resume        |
| `generate_cover_letter` | Create custom cover letter    |
| `track_application`     | Update job application status |

## Configuration

```typescript
{
  "plugins": {
    "job-search": {
      "atsThreshold": 0.8,  // Minimum ATS compatibility score
      "matchThreshold": 0.7,  // Minimum job match score
      "cloudEditor": "google-docs" // Editor service for document editing
    }
  }
}
```

## Dependencies

-   @elizaos/core
-   @elizaos/plugin-node (for PDF and Browser services)
-   pdf-parse
-   cheerio
-   openrouter-sdk

## Contributing

Contributions welcome! Please read our contributing guidelines.

## License

MIT
