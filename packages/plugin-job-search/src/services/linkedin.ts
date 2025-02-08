import {
    Service,
    ServiceType,
    type IAgentRuntime,
    elizaLogger,
} from "@elizaos/core";
import * as puppeteer from "puppeteer";
import { LinkedInConfig, LinkedInConfigSchema } from "../types";

export class LinkedInService extends Service {
    static serviceType: ServiceType = ServiceType.LINKEDIN;
    private browser?: puppeteer.Browser;
    private config: LinkedInConfig;
    private isAuthenticated = false;

    constructor(runtime: IAgentRuntime) {
        super();
        this.config = this.validateConfig(runtime);
    }

    private validateConfig(runtime: IAgentRuntime): LinkedInConfig {
        const config = {
            LINKEDIN_EMAIL: runtime.getSetting("LINKEDIN_EMAIL"),
            LINKEDIN_PASSWORD: runtime.getSetting("LINKEDIN_PASSWORD"),
            LINKEDIN_2FA_SECRET: runtime.getSetting("LINKEDIN_2FA_SECRET"),
            LINKEDIN_RETRY_LIMIT: Number(
                runtime.getSetting("LINKEDIN_RETRY_LIMIT") || 5
            ),
            LINKEDIN_POLL_INTERVAL: Number(
                runtime.getSetting("LINKEDIN_POLL_INTERVAL") || 120
            ),
        };

        return LinkedInConfigSchema.parse(config);
    }

    async initialize(): Promise<void> {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: false,
                args: ["--no-sandbox"],
            });
            await this.login();
        }
    }

    private async login(): Promise<void> {
        if (!this.browser) throw new Error("Browser not initialized");

        const page = await this.browser.newPage();
        try {
            await page.goto("https://www.linkedin.com/login");
            await page.type("#username", this.config.LINKEDIN_EMAIL);
            await page.type("#password", this.config.LINKEDIN_PASSWORD);
            await page.click('[type="submit"]');

            // Handle 2FA if needed
            if (this.config.LINKEDIN_2FA_SECRET) {
                // Implement 2FA logic here
            }

            // Wait for successful login
            await page.waitForNavigation();
            this.isAuthenticated = true;
            elizaLogger.log("LinkedIn login successful");
        } catch (error) {
            elizaLogger.error("LinkedIn login failed:", error);
            throw error;
        } finally {
            await page.close();
        }
    }
    async getProfileContent(url: string): Promise<string> {
        if (!this.isAuthenticated || !this.browser) {
            await this.initialize();
        }

        const page = await this.browser!.newPage();
        try {
            await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });

            // Define section scraping helper
            const scrapeSection = async (sectionId: string) => {
                return page.evaluate((id) => {
                    const section = document.querySelector(
                        `section:has(#${id})`
                    );
                    if (!section) return "";

                    // Get section title
                    const title =
                        section.querySelector("h2")?.innerText.trim() ||
                        id.charAt(0).toUpperCase() + id.slice(1);

                    // Get section content based on type
                    let content = "";

                    if (id === "about") {
                        content =
                            section
                                .querySelector('div[class*="full-width"] span')
                                ?.textContent?.trim() || "";
                    } else {
                        const items = Array.from(
                            section.querySelectorAll("ul > li")
                        );
                        content = items
                            .map((item) => {
                                const title =
                                    item
                                        .querySelector(
                                            'div[class*="t-bold"] span'
                                        )
                                        ?.textContent?.trim() || "";
                                const subtitle =
                                    item
                                        .querySelector(
                                            'span[class*="t-normal"] span'
                                        )
                                        ?.textContent?.trim() || "";
                                const description =
                                    item
                                        .querySelector(
                                            'div[class*="inline-show-more-text"] span'
                                        )
                                        ?.textContent?.trim() || "";
                                return [title, subtitle, description]
                                    .filter(Boolean)
                                    .join("\n");
                            })
                            .join("\n\n");
                    }

                    return content ? `${title}\n${content}` : "";
                }, sectionId);
            };

            // Scrape each section with delay
            const sections = [];
            try {
                for (const section of [
                    "about",
                    "experience",
                    "education",
                    "skills",
                ]) {
                    const content = await scrapeSection(section);
                    if (content) sections.push(content);
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
            } catch (error) {
                elizaLogger.error("Error scraping LinkedIn profile:", error);
                throw error;
            }

            return sections.join("\n\n");
        } catch (error) {
            elizaLogger.error("Error fetching LinkedIn profile:", error);
            throw error;
        } finally {
            await page.close();
            await this.cleanup();
        }
    }

    async cleanup(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = undefined;
            this.isAuthenticated = false;
        }
    }
}
