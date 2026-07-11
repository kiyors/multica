/* eslint-disable i18next/no-literal-string */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@multica/ui/components/ui/tabs";
import { ProjectMembersTab } from "./project-members-tab";
import { ProjectGeneralSettings } from "./project-general-settings";
import { LabelsPanel } from "../../issues/components/labels-panel";
import { IssueTypesTab } from "../../settings/components/issue-types-tab";

export function ProjectSettingsTab({ projectId }: { projectId: string }) {
  
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="members" className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="labels">Labels</TabsTrigger>
            <TabsTrigger value="issue_types">Issue Types</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="members" className="flex-1 overflow-y-auto m-0 border-none p-0 outline-none data-[state=inactive]:hidden">
          <ProjectMembersTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="general" className="flex-1 overflow-y-auto m-0 border-none p-0 outline-none data-[state=inactive]:hidden">
          <ProjectGeneralSettings projectId={projectId} />
        </TabsContent>

        <TabsContent value="labels" className="flex-1 overflow-y-auto m-0 border-none p-0 outline-none data-[state=inactive]:hidden">
          <div className="p-6">
            <h3 className="mb-4 text-lg font-medium">Labels</h3>
            <LabelsPanel projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="issue_types" className="flex-1 overflow-y-auto m-0 border-none p-0 outline-none data-[state=inactive]:hidden">
          <div className="p-6">
            <h3 className="mb-4 text-lg font-medium">Issue Types</h3>
            <IssueTypesTab projectId={projectId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
