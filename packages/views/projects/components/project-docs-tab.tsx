"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectDocument } from "@multica/core/types";
import {
  useCreateProjectDocument,
  useDeleteProjectDocument,
  useProjectDocuments,
  useUpdateProjectDocument,
} from "@multica/core/documents";
import { Button } from "@multica/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@multica/ui/components/ui/dropdown-menu";
import { Input } from "@multica/ui/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { ContentEditor } from "../../editor/content-editor";
import { useT } from "../../i18n";

export function safeMarkdownFilename(title: string): string {
  const stem = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 100) || "untitled";
  return `${stem}.md`;
}

export function projectDocumentMarkdown(document: ProjectDocument): string {
  return document.content
    ? `# ${document.title}\n\n${document.content.trimEnd()}\n`
    : `# ${document.title}\n`;
}

export function exportProjectDocument(document: ProjectDocument): void {
  const markdown = projectDocumentMarkdown(document);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = safeMarkdownFilename(document.title);
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ProjectDocsTab({ projectId }: { projectId: string }) {
  const { t } = useT("projects");
  const { data: docs = [] } = useProjectDocuments(projectId);
  const createMutation = useCreateProjectDocument(projectId);
  const updateMutation = useUpdateProjectDocument(projectId);
  const deleteMutation = useDeleteProjectDocument(projectId);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [draftTitle, setDraftTitle] = useState("");
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedDoc = docs.find((document) => document.id === selectedDocId) ?? null;
  const rootDocs = useMemo(
    () => docs.filter((document) => !document.parent_id),
    [docs],
  );
  const childrenByParent = useMemo(() => {
    const result = new Map<string, ProjectDocument[]>();
    for (const document of docs) {
      if (!document.parent_id) continue;
      const children = result.get(document.parent_id) ?? [];
      children.push(document);
      result.set(document.parent_id, children);
    }
    return result;
  }, [docs]);

  useEffect(() => {
    setDraftTitle(selectedDoc?.title ?? "");
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
  }, [selectedDoc?.id]);

  useEffect(
    () => () => {
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    },
    [],
  );

  const createDocument = (documentType: "page" | "folder", parentId: string | null = null) => {
    createMutation.mutate(
      {
        title: documentType === "folder" ? "Untitled Folder" : "Untitled Document",
        content: "",
        parent_id: parentId,
        document_type: documentType,
      },
      {
        onSuccess: (newDocument) => {
          setSelectedDocId(newDocument.id);
          if (parentId) {
            setExpandedFolders((current) => new Set(current).add(parentId));
          }
        },
      },
    );
  };

  const scheduleTitleSave = (document: ProjectDocument, title: string) => {
    setDraftTitle(title);
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(() => {
      const trimmed = title.trim();
      if (trimmed && trimmed !== document.title) {
        updateMutation.mutate({ documentId: document.id, data: { title: trimmed } });
      }
    }, 600);
  };

  const flushTitle = (document: ProjectDocument) => {
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== document.title) {
      updateMutation.mutate({ documentId: document.id, data: { title: trimmed } });
    } else if (!trimmed) {
      setDraftTitle(document.title);
    }
  };

  const removeDocument = (document: ProjectDocument) => {
    const suffix = document.document_type === "folder"
      ? " Pages inside it will be moved to the document root."
      : "";
    if (!window.confirm(`Delete “${document.title}”?${suffix}`)) return;
    deleteMutation.mutate(document.id, {
      onSuccess: () => {
        if (selectedDocId === document.id) setSelectedDocId(null);
      },
    });
  };

  return (
    <div className="flex h-full min-h-[640px] w-full overflow-hidden">
      <aside className="flex w-72 shrink-0 flex-col border-r bg-muted/20">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-medium">{t(($) => $.docs.title)}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" disabled={createMutation.isPending} title="Add document">
                  <Plus className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => createDocument("page")}>
                <FilePlus2 /> {t(($) => $.docs.new_page)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createDocument("folder")}>
                <FolderPlus /> {t(($) => $.docs.new_folder)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {rootDocs.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {t(($) => $.docs.empty)}
            </div>
          ) : null}
          <DocumentTree
            documents={rootDocs}
            childrenByParent={childrenByParent}
            selectedId={selectedDocId}
            expandedFolders={expandedFolders}
            onToggleFolder={(id) =>
              setExpandedFolders((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onSelect={setSelectedDocId}
            onCreatePage={(parentId) => createDocument("page", parentId)}
            onCreateFolder={(parentId) => createDocument("folder", parentId)}
            onDelete={removeDocument}
          />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        {selectedDoc ? (
          <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-6 px-8 py-10">
            <div className="flex items-center gap-3">
              {selectedDoc.document_type === "folder" ? (
                <Folder className="h-7 w-7 shrink-0 text-muted-foreground" />
              ) : null}
              <Input
                value={draftTitle}
                onChange={(event) => scheduleTitleSave(selectedDoc, event.target.value)}
                onBlur={() => flushTitle(selectedDoc)}
                className="h-auto border-none bg-transparent px-0 text-3xl font-bold shadow-none focus-visible:ring-0"
                placeholder={selectedDoc.document_type === "folder" ? "Folder name" : "Document title"}
              />
            </div>

            {selectedDoc.document_type === "folder" ? (
              <div className="rounded-lg border border-dashed p-8">
                <Folder className="mb-3 h-8 w-8 text-muted-foreground" />
                <h4 className="font-medium">{selectedDoc.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(($) => $.docs.item_count, { count: childrenByParent.get(selectedDoc.id)?.length ?? 0 })}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => createDocument("page", selectedDoc.id)}>
                    <FilePlus2 className="h-4 w-4" /> {t(($) => $.docs.new_page)}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => createDocument("folder", selectedDoc.id)}>
                    <FolderPlus className="h-4 w-4" /> {t(($) => $.docs.new_folder)}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="min-h-[520px] flex-1">
                <ContentEditor
                  key={selectedDoc.id}
                  defaultValue={selectedDoc.content || ""}
                  onUpdate={(content) =>
                    updateMutation.mutate({ documentId: selectedDoc.id, data: { content } })
                  }
                  debounceMs={750}
                  flushPendingOnUnmount
                  placeholder="Start writing… Type ``` for a code block."
                  className="min-h-[520px]"
                  enableSlashCommands
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <FileText className="h-10 w-10" />
            <p>{t(($) => $.docs.select_empty)}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function DocumentTree({
  documents,
  childrenByParent,
  selectedId,
  expandedFolders,
  onToggleFolder,
  onSelect,
  onCreatePage,
  onCreateFolder,
  onDelete,
  depth = 0,
}: {
  documents: ProjectDocument[];
  childrenByParent: Map<string, ProjectDocument[]>;
  selectedId: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  onSelect: (id: string) => void;
  onCreatePage: (parentId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onDelete: (document: ProjectDocument) => void;
  depth?: number;
}) {
  const { t } = useT("projects");
  const sorted = [...documents].sort((a, b) => {
    if (a.document_type !== b.document_type) return a.document_type === "folder" ? -1 : 1;
    return a.sort_order - b.sort_order || a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-0.5">
      {sorted.map((document) => {
        const isFolder = document.document_type === "folder";
        const expanded = expandedFolders.has(document.id);
        const children = childrenByParent.get(document.id) ?? [];
        return (
          <div key={document.id}>
            <div
              className={`group flex items-center gap-1 rounded-md pr-1 text-sm ${selectedId === document.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"}`}
              style={{ paddingLeft: `${depth * 14 + 4}px` }}
            >
              {isFolder ? (
                <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => onToggleFolder(document.id)}>
                  {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <span className="w-[22px]" />
              )}
              <button type="button" onClick={() => onSelect(document.id)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
                {isFolder ? <Folder className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                <span className="truncate">{document.title}</span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button type="button" className="rounded p-1 opacity-0 hover:bg-muted group-hover:opacity-100" aria-label={`Actions for ${document.title}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  }
                />
                <DropdownMenuContent align="start">
                  {isFolder ? (
                    <>
                      <DropdownMenuItem onClick={() => onCreatePage(document.id)}><FilePlus2 /> {t(($) => $.docs.new_page_inside)}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCreateFolder(document.id)}><FolderPlus /> {t(($) => $.docs.new_folder_inside)}</DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => exportProjectDocument(document)}><Download /> {t(($) => $.docs.export_markdown)}</DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(document)}><Trash2 /> {t(($) => $.docs.delete)}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isFolder && expanded && children.length > 0 ? (
              <DocumentTree
                documents={children}
                childrenByParent={childrenByParent}
                selectedId={selectedId}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onSelect={onSelect}
                onCreatePage={onCreatePage}
                onCreateFolder={onCreateFolder}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
