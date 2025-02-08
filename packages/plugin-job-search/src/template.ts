export const resumeParsingTemplate = `
<context>
# Document Content
Content: {{content}}
Type: {{documentType}}
Format: {{format}}

<parsing_steps>
1. Extract Professional Information:
• Full name and title
• Contact information if present
• Professional summary/about section
• Current role and company

2. Parse Work Experience:
• Company names and positions
• Employment dates (MM/YYYY format)
• Key responsibilities and achievements
• Notable metrics and outcomes

3. Extract Education:
• Institutions and degrees
• Fields of study
• Graduation dates
• Academic achievements

4. Identify Skills:
• Technical skills and tools
• Soft skills and competencies
• Certifications and qualifications
• Languages and proficiency levels

5. Additional Sections:
• Projects and contributions
• Volunteer work
• Publications or patents
• Awards and recognition
</parsing_steps>

<instructions>
First, identify and extract key sections from the content. Then structure the information according to the Resume schema.

For LinkedIn profiles:
• Focus on current role details
• Extract complete experience timeline
• Map skills to relevant experiences
• Preserve chronological order

Ensure all dates are in YYYY-MM-DD format and all text fields are properly cleaned of special characters.
</instructions>

Remember: Maintain factual accuracy. Do not infer or generate information not present in the source content.
</context>`;
