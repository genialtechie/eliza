import { processResume } from "./actions";
import { ResumeService } from "./services";
import { type IAgentRuntime, type Plugin } from "@elizaos/core";
export * from "./services";
export * from "./types";
export * from "./template";
export * from "./actions";

export type JobSearchPlugin = ReturnType<typeof createJobSearchPlugin>;

export function createJobSearchPlugin() {
    return {
        name: "job-search",
        description: "A plugin for job searching",
        services: [new ResumeService()],
        actions: [processResume],
        evaluators: [],
    } as const satisfies Plugin;
}
