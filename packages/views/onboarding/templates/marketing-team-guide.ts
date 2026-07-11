export const MARKETING_TEAM_GUIDE_TITLE: Record<string, string> = {
  en: "Welcome to Multica Guide 🚀",
};

export const MARKETING_TEAM_GUIDE_BODY: Record<string, string> = {
  en: `Welcome to Multica! This guide will show you how to use Multica's task tracking and media review features to get your work done faster.

---

## 1. Creating a Task

Everything starts with a Task (often referred to as an Issue in technical terms). 

1. **Create a New Task**: Click the **New Task** button in your project.
2. **Assign & Detail**: Give it a clear title (e.g., *Summer Campaign Video Ad*), assign the relevant team members (like your video editor and copywriter), and add a description with your creative brief.
3. **Set Priorities**: Use labels and priorities so your team knows what needs immediate attention.

## 2. Uploading Media for Review

When a creative asset is ready for feedback, the assignee can upload it directly to the task.

1. **Open the Task**: Navigate to the task where the asset belongs.
2. **Upload**: Drag and drop your video (MP4, WebM), image, or PDF directly into the **Review Assets** section.
3. **Wait for Processing**: Multica will process the video for playback or parse the PDF for page-by-page review.

## 3. Leaving Feedback (Media Review)

This is where Multica shines for marketing teams. You don't need a separate tool to review videos or PDFs.

### Reviewing Videos
- **Play and Pause**: Click the asset to open the media player.
- **Scrubbing**: Use the timeline scrubber at the bottom to find the exact frame you want to comment on.
- **Frame-Accurate Comments**: Click anywhere on the video frame, or just pause and type a comment. The comment will be stamped with the exact timestamp (e.g., \`0:14 - Make the logo bigger\`).
- **Shapes & Annotations**: You can draw boxes or arrows on the video frame to clearly point out what needs changing.

### Reviewing PDFs and Images
- **Page Navigation**: For PDFs, use the carousel controls to flip between pages.
- **Page-Specific Feedback**: Any comment you leave will be automatically tied to the specific page you are viewing.

## 4. The Review Cycle

Feedback left on media assets is instantly synced to the task timeline for everyone to see.

- **Timeline Deep-Linking**: When a team member looks at the task timeline, they will see your comments. Clicking **"Open media review"** on a comment will instantly open the media player, navigate to the correct PDF page or seek to the exact video timestamp, and highlight your annotations!
- **Pending/Optimistic Comments**: Your comments appear instantly on your screen, even before the server fully processes them, so you can review assets rapidly without waiting.
- **Resolving Feedback**: Once the creative team updates the asset, they can click **Resolve** on your comment.

## 5. Next Steps

- **Iterate**: If changes are requested, a new version of the asset can be uploaded to the same task, keeping the history clean.
- **Approval**: Once all feedback is resolved and the asset looks good, the task can be moved to **Done**!

---

*Tip: Multica also supports inviting Guests for review. If you need a client or external stakeholder to approve an asset, you can share a guest link with them!*
`,
};


export async function seedRoleBasedWelcomeIssue(
  workspaceId: string,
  _role: string,
  assigneeId: string,
  lang: string = "en",
) {
  // We now want to seed this welcome issue for ALL users who join the workspace,
  // not just marketing/creative, so they get a guide on how to use Multica.

  try {
    const title = MARKETING_TEAM_GUIDE_TITLE[lang] || MARKETING_TEAM_GUIDE_TITLE["en"];
    const body = MARKETING_TEAM_GUIDE_BODY[lang] || MARKETING_TEAM_GUIDE_BODY["en"];

    await fetch(`/api/issues?workspace_id=${workspaceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Fallback for some backend routes that strictly require the header
        "x-workspace-id": workspaceId,
      },
      body: JSON.stringify({
        title,
        description: body,
        status: "todo",
        priority: "high",
        assignee_type: "member",
        assignee_id: assigneeId,
      }),
    });
  } catch (err) {
    console.warn("Failed to seed welcome issue:", err);
  }
}
