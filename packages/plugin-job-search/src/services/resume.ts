import {
    Service,
    ServiceType,
    type IAgentRuntime,
    type IPdfService,
    type IBrowserService,
    generateObject,
    ModelClass,
    elizaLogger,
} from "@elizaos/core";
import { ResumeSchema, Resume } from "../types";
import { resumeParsingTemplate } from "../template";
import { LinkedInService } from "./index";

export class ResumeService extends Service {
    static serviceType: ServiceType = ServiceType.RESUME;
    private pdfService: IPdfService;
    private browserService: IBrowserService;
    private runtime: IAgentRuntime;
    private linkedInService: LinkedInService;

    constructor() {
        super();
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        this.runtime = runtime;
        this.pdfService = runtime.getService<IPdfService>(ServiceType.PDF);
        this.browserService = runtime.getService<IBrowserService>(
            ServiceType.BROWSER
        );

        // this.linkedInService = new LinkedInService(this.runtime);
        // await this.linkedInService.initialize();

        if (!this.browserService) {
            throw new Error("Browser service not found");
        }
    }

    async parseResumePDF(pdfBuffer: Buffer): Promise<Resume> {
        try {
            elizaLogger.debug("Starting PDF resume parsing");
            const text = await this.pdfService.convertPdfToText(pdfBuffer);

            // Clean up any potential XML tags and fix double quotes
            const cleanText = text
                .replace(/<\/?[^>]+(>|$)/g, "") // Remove XML-style tags
                .replace(/"{2,}name"{2,}/g, '"name"') // Fix double quotes around "name"
                .replace(/"{2,}([^"]+)"{2,}/g, '"$1"'); // Fix other double quoted values

            const result = await this.parseResumeText(cleanText);
            elizaLogger.debug("Successfully parsed PDF resume");
            return result;
        } catch (error) {
            elizaLogger.error("Failed to parse PDF resume:", error);
            throw error;
        }
    }

    async scrapeLinkedInProfile(url: string) {
        try {
            elizaLogger.debug("Starting LinkedIn profile scraping");
            const content = await this.linkedInService.getProfileContent(url);

            return this.parseLinkedInFormat(content);
        } catch (error) {
            elizaLogger.error("LinkedIn scraping failed:", error);
            throw error;
        }
    }

    private async parseResumeText(text: string) {
        try {
            elizaLogger.debug("Parsing resume text with LLM");
            const context = await this.buildResumeContext(text);
            const { object } = await generateObject({
                runtime: this.runtime,
                context: resumeParsingTemplate
                    .replace("{{content}}", context.content)
                    .replace("{{documentType}}", "resume")
                    .replace("{{format}}", "text"),
                modelClass: ModelClass.LARGE,
                schema: ResumeSchema,
                schemaName: "generateResume",
                schemaDescription: "Generate a structured resume",
            });

            if (!object) {
                throw new Error("LLM returned empty response");
            }

            const parsed = ResumeSchema.parse(object);
            elizaLogger.debug("Successfully parsed resume structure");
            return parsed;
        } catch (error) {
            elizaLogger.error("Resume parsing failed:", error);
            throw error;
        }
    }

    private async parseLinkedInFormat(content: string) {
        try {
            // Parse sections first
            const sections = this.parseLinkedInSections(content);
            elizaLogger.debug("LinkedIn sections parsed:", sections);

            // Build context with cleaned sections
            const contextText = Object.entries(sections)
                .filter(
                    ([_, value]) =>
                        value &&
                        (Array.isArray(value) ? value.length > 0 : true)
                )
                .map(([key, value]) => {
                    if (Array.isArray(value)) {
                        return `${
                            key.charAt(0).toUpperCase() + key.slice(1)
                        }\n${value.join("\n")}`;
                    }
                    return `${
                        key.charAt(0).toUpperCase() + key.slice(1)
                    }\n${value}`;
                })
                .join("\n\n");

            elizaLogger.info("Context built for LLM:", contextText);

            // Generate resume object using the template with strict JSON formatting
            const prompt =
                resumeParsingTemplate
                    .replace("{{content}}", contextText)
                    .replace("{{documentType}}", "linkedin")
                    .replace("{{format}}", "text") +
                "\n\nIMPORTANT: Ensure the response is valid JSON with all properties properly quoted.";

            elizaLogger.debug("Sending prompt to LLM:", prompt);

            const { object } = await generateObject({
                runtime: this.runtime,
                context: prompt,
                modelClass: ModelClass.LARGE,
                schema: ResumeSchema,
                schemaName: "parseLinkedIn",
                schemaDescription:
                    "Parse LinkedIn profile data into Resume schema",
            });

            if (!object) {
                throw new Error("LLM returned empty response");
            }

            elizaLogger.info("Raw LLM response:", object);

            // Validate against schema
            const parsed = ResumeSchema.parse(object);
            elizaLogger.debug("Schema validation passed:", parsed);

            return parsed;
        } catch (error) {
            elizaLogger.error("Failed to parse LinkedIn format:", error);
            throw error;
        }
    }

    private parseLinkedInSections(text: string): {
        about?: string;
        experience: string[];
        education: string[];
        skills: string[];
    } {
        const sections: any = {};

        // Extract About section
        const aboutMatch = text.match(
            /About\n([\s\S]*?)(?=\n\n|Experience|$)/i
        );
        sections.about = aboutMatch?.[1]?.trim();

        // Extract Experience section
        const experienceMatch = text.match(
            /Experience\n([\s\S]*?)(?=\n\n|Education|$)/i
        );
        sections.experience =
            experienceMatch?.[1]
                ?.split(/\n{2,}/)
                .filter((exp) => exp.trim())
                .map((exp) => exp.trim()) || [];

        // Extract Education section
        const educationMatch = text.match(
            /Education\n([\s\S]*?)(?=\n\n|Skills|$)/i
        );
        sections.education =
            educationMatch?.[1]
                ?.split(/\n{2,}/)
                .filter((edu) => edu.trim())
                .map((edu) => edu.trim()) || [];

        // Extract Skills section
        const skillsMatch = text.match(/Skills\n([\s\S]*?)(?=\n\n|$)/i);
        sections.skills =
            skillsMatch?.[1]
                ?.split(/[,•\n]/)
                .filter((skill) => skill.trim())
                .map((skill) => skill.trim()) || [];

        elizaLogger.debug("LinkedIn sections parsed:", {
            hasAbout: !!sections.about,
            experienceCount: sections.experience.length,
            educationCount: sections.education.length,
            skillsCount: sections.skills.length,
        });

        return sections;
    }

    private async buildResumeContext(text: string): Promise<{
        content: string;
        metadata: Record<string, unknown>;
    }> {
        return {
            content: text,
            metadata: {
                timestamp: new Date(),
                format: "text",
                wordCount: text.split(/\s+/).length,
                sections: text.split(/\n{2,}/).length,
            },
        };
    }
}
