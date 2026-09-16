import { describe, expect, it } from "vitest";

import { landingNavigationTools, navigationGroups, navigationTools } from "./navigation-tools";

describe("user navigation order", () => {
    it("keeps the landing page entries in their dedicated order", () => {
        expect(landingNavigationTools).toEqual([{ slug: "create", label: "Agent" }]);
    });

    it("keeps the unified Agent as the only generation entry in workspace navigation", () => {
        expect(navigationGroups.map((group) => group.label)).toEqual(["创作", "项目", "资产", "系统"]);
        expect(navigationTools.map((tool) => tool.slug)).not.toContain("image");
        expect(navigationTools.map((tool) => tool.slug)).not.toContain("video");
        expect(navigationTools.map((tool) => tool.slug)).not.toContain("community");
        expect(navigationTools.map((tool) => tool.slug)).not.toContain("works");
    });

    it("keeps personal assets and settings without commerce entries", () => {
        expect(navigationTools.filter((tool) => tool.group === "assets").map((tool) => tool.label)).toEqual(["素材", "提示词"]);
        expect(navigationTools.filter((tool) => tool.group === "system").map((tool) => tool.label)).toEqual(["设置"]);
    });
});
