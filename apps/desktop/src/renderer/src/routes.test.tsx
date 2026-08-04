import { isValidElement } from "react";
import { matchRoutes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { appRoutes } from "./routes";

describe("desktop project routes", () => {
  for (const tab of ["board", "docs", "milestones", "settings"] as const) {
    it(`matches the ${tab} project tab`, () => {
      const matches = matchRoutes(appRoutes, `/acme/projects/project-1/${tab}`);
      const leaf = matches?.at(-1)?.route.element;

      const element = isValidElement<{ activeTab?: string }>(leaf) ? leaf : undefined;
      expect(element).toBeDefined();
      expect(element?.props.activeTab).toBe(tab);
    });
  }
});
