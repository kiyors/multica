import { describe, expect, it } from "vitest";
import type { ProjectDocument } from "@multica/core/types";
import { projectDocumentMarkdown, safeMarkdownFilename } from "./project-docs-tab";

describe("project document Markdown export", () => {
  it("preserves fenced-code language metadata", () => {
    const document = {
      id: "doc-1",
      project_id: "project-1",
      parent_id: null,
      title: "API example",
      content: "```typescript\nconst answer: number = 42;\n```",
      sort_order: 0,
      created_by: null,
      created_at: "",
      updated_at: "",
      document_type: "page",
    } satisfies ProjectDocument;

    expect(projectDocumentMarkdown(document)).toContain(
      "```typescript\nconst answer: number = 42;\n```",
    );
  });

  it("creates a filesystem-safe Markdown filename", () => {
    expect(safeMarkdownFilename("Design / API: v2")).toBe("Design - API- v2.md");
  });
});
