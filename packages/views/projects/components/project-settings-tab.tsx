/* eslint-disable i18next/no-literal-string */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@multica/ui/components/ui/tabs";
import { ProjectMembersTab } from "./project-members-tab";
import { ProjectGeneralSettings } from "./project-general-settings";

export function ProjectSettingsTab({ projectId }: { projectId: string }) {
  
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="members" className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="members" className="flex-1 overflow-y-auto m-0 border-none p-0 outline-none data-[state=inactive]:hidden">
          <ProjectMembersTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="general" className="flex-1 overflow-y-auto m-0 border-none p-0 outline-none data-[state=inactive]:hidden">
          <ProjectGeneralSettings projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
