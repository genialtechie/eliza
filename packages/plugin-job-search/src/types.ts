import { z } from "zod";

// Schema for parsed resume data
export const ResumeSchema = z.object({
    basics: z.object({
        name: z.string(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional().or(z.literal("")),
        location: z.string().optional().or(z.literal("")),
        summary: z.string().optional().or(z.literal("")),
    }),
    experience: z.array(
        z.object({
            company: z.string(),
            position: z.string(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            highlights: z.array(z.string()).optional(),
        })
    ),
    education: z.array(
        z.object({
            institution: z.string(),
            area: z.string().optional(),
            studyType: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        })
    ),
    skills: z.array(
        z.object({
            name: z.string(),
        })
    ),
});

export type Resume = z.infer<typeof ResumeSchema>;

export const LinkedInConfigSchema = z.object({
    LINKEDIN_EMAIL: z.string().email("Valid LinkedIn email is required"),
    LINKEDIN_PASSWORD: z.string().min(1, "LinkedIn password is required"),
    LINKEDIN_2FA_SECRET: z.string().optional().nullable(),
    LINKEDIN_RETRY_LIMIT: z.number().int().default(5),
    LINKEDIN_POLL_INTERVAL: z.number().int().default(120),
});

export type LinkedInConfig = z.infer<typeof LinkedInConfigSchema>;
