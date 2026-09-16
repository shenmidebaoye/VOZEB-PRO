import { describe, expect, it } from "vitest";

import { adminSectionHref, canAccessAdminSection, parseAdminSection, resolveAdminSection } from "./admin-sections";

describe("settings sections", () => {
    it("parses a valid section and falls back to channels", () => {
        expect(parseAdminSection("channels")).toBe("channels");
        expect(parseAdminSection(["skills", "channels"])).toBe("skills");
        expect(parseAdminSection("missing")).toBe("channels");
    });

    it("keeps unrelated query parameters while updating the current section", () => {
        expect(adminSectionHref("skills", "https://example.com/settings?from=notice#top")).toBe("/settings?from=notice&section=skills#top");
        expect(adminSectionHref("channels", "https://example.com/settings?section=skills&from=notice#top")).toBe("/settings?from=notice#top");
    });

    it("allows all local settings sections", () => {
        const owner = { role: "admin", status: "active", adminPermissions: [] };
        expect(canAccessAdminSection(owner, "backup")).toBe(true);
        expect(resolveAdminSection(owner, "backup")).toBe("backup");
    });
});
