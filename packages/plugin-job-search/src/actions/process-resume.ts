import {
    Action,
    IAgentRuntime,
    Memory,
    ServiceType,
    elizaLogger,
    State,
    HandlerCallback,
} from "@elizaos/core";
import { ResumeService } from "../services/resume";
import { Resume } from "../types";
import * as fs from "fs";

interface ResumeState extends State {
    resume?: Resume;
}

export const processResume: Action = {
    name: "process_resume",
    description: "Parse and analyze a resume from PDF or LinkedIn",
    similes: ["parse_resume", "read_resume", "analyze_resume"],

    async validate(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        // Check for PDF attachment or LinkedIn URL
        return (
            message.content.attachments?.some(
                (a) => a.contentType === "application/pdf"
            ) || message.content.text.includes("linkedin.com/in/")
        );
    },

    async handler(
        runtime: IAgentRuntime,
        message: Memory,
        state?: ResumeState,
        _options: { [key: string]: unknown } = {},
        callback?: HandlerCallback
    ): Promise<boolean> {
        try {
            state = (await runtime.composeState(message)) as ResumeState;

            const resumeService = runtime.getService<ResumeService>(
                ServiceType.RESUME
            );
            if (!resumeService) {
                throw new Error("Resume service not initialized properly");
            }

            let resume;
            try {
                if (message.content.attachments?.length) {
                    const pdfAttachment = message.content.attachments.find(
                        (a) => a.contentType === "application/pdf"
                    );
                    if (!pdfAttachment) {
                        throw new Error("No valid PDF attachment found");
                    }

                    let pdfBuffer: Buffer;
                    if (pdfAttachment.url?.startsWith("http")) {
                        // Handle remote URLs
                        const response = await fetch(pdfAttachment.url);
                        const arrayBuffer = await response.arrayBuffer();
                        pdfBuffer = Buffer.from(arrayBuffer);
                    } else if (pdfAttachment.url) {
                        // Handle local file paths
                        pdfBuffer = await fs.promises.readFile(
                            pdfAttachment.url
                        );
                    } else {
                        throw new Error(
                            "Invalid PDF attachment: no URL or file path"
                        );
                    }

                    resume = await resumeService.parseResumePDF(pdfBuffer);
                } else if (message.content.text.includes("linkedin.com/in/")) {
                    const linkedInUrl = message.content.text.match(
                        /https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+/
                    )?.[0];
                    if (!linkedInUrl) {
                        throw new Error("Invalid LinkedIn profile URL");
                    }
                    resume = await resumeService.scrapeLinkedInProfile(
                        linkedInUrl
                    );
                } else {
                    throw new Error("No valid resume source provided");
                }
            } catch (error) {
                elizaLogger.error("Resume parsing failed:", error);
                throw new Error(
                    `Failed to parse resume: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }

            if (!resume || !resume.basics) {
                throw new Error("Failed to extract resume information");
            }

            // Update state
            if (state) {
                state.resume = resume;
                await runtime.updateRecentMessageState(state).catch((error) => {
                    elizaLogger.error("Failed to update state:", error);
                });
            }

            // Create memory of the processed resume
            await runtime.messageManager
                .createMemory({
                    userId: message.userId,
                    agentId: message.agentId,
                    roomId: message.roomId,
                    content: {
                        text: resume,
                    },
                })
                .catch((error) => {
                    elizaLogger.error("Failed to create memory:", error);
                });

            if (callback) {
                const response =
                    `📄 **Resume Processed Successfully**\n\n` +
                    `**Name:** ${resume.basics.name || "Not found"}\n` +
                    `${
                        resume.basics.summary
                            ? `**Summary:** ${resume.basics.summary}\n`
                            : ""
                    }` +
                    `**Experience:** ${
                        resume.experience?.length || 0
                    } positions\n` +
                    `**Skills:** ${
                        resume.skills?.map((s) => s.name).join(", ") ||
                        "None listed"
                    }\n\n` +
                    `Would you like me to check if it's ATS-friendly?`;

                callback({
                    text: response,
                });
            }

            return true;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            elizaLogger.error("Resume processing failed:", {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });

            if (callback) {
                callback({
                    text: `I encountered an error processing your resume: ${errorMessage}. Please try again.`,
                    content: { error: errorMessage },
                });
            }
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "I have a PDF resume attached" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'm processing your resume...",
                    action: "PROCESS_RESUME",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "I have a LinkedIn profile URL" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'm processing your resume...",
                    action: "PROCESS_RESUME",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you analyze my resume?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll analyze your resume PDF right away...",
                    action: "PROCESS_RESUME",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Here's my LinkedIn profile: https://linkedin.com/in/johndoe",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll analyze your LinkedIn profile...",
                    action: "PROCESS_RESUME",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Please review my resume",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll process your resume...",
                    action: "PROCESS_RESUME",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check my profile on LinkedIn please linkedin.com/in/jane-smith-123",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll analyze your LinkedIn profile and provide feedback...",
                    action: "PROCESS_RESUME",
                },
            },
        ],
    ],
} as Action;
