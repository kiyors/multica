import React, { useState } from "react";
import { View, StyleSheet, SafeAreaView, Pressable, Text } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MediaReviewPlayer } from "@/components/reviews/media-review-player";
import { ToolPalette } from "@/components/reviews/tool-palette";
import { ReviewComposer } from "@/components/reviews/review-composer";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useCreateReviewComment } from "@/data/mutations/reviews";
import { listReviewCommentsOptions } from "@/data/queries/reviews";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { useQuery } from "@tanstack/react-query";

export default function MediaReviewScreen() {
  const { assetId, issueId, workspace: wsSlug, url, filename, contentType } = useLocalSearchParams<{ assetId: string, issueId: string, workspace: string, url: string, filename: string, contentType: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme];

  const [selectedTool, setSelectedTool] = useState<'pen' | 'arrow' | 'rectangle' | 'ellipse'>('rectangle');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [drawingShape, setDrawingShape] = useState<any>(null);
  const [isComposerVisible, setComposerVisible] = useState(false);
  const [timestamp, setTimestamp] = useState<number | null>(null);

  // Find the target asset
  const asset = url ? { id: assetId, url, filename, content_type: contentType } : null;

  const { data: comments = [] } = useQuery(listReviewCommentsOptions(wsId, issueId, assetId));

  const { mutate: createComment } = useCreateReviewComment();

  const handleDrawEnd = (shape: any) => {
    setDrawingShape(shape);
    if (shape) {
      setComposerVisible(true);
    }
  };

  const submitComment = (content: string) => {
    if (!wsId) return;
    createComment({
      wsId,
      issueId: issueId,
      assetId: assetId,
      content,
      start_time: timestamp ?? undefined,
      end_time: timestamp ?? undefined,
      shapes: drawingShape ? [drawingShape] : [],
    });
    
    // Cleanup state
    setComposerVisible(false);
    setDrawingShape(null);
  };

  if (!asset) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.foreground }}>Asset not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.brand }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // Convert attachment to ReviewAsset format expected by player
  const reviewAsset = {
    ...asset,
    asset_type: asset.content_type.startsWith("video/") ? "video" : "image" as "video" | "image",
    src_url: asset.url,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{asset.filename}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.playerContainer}>
        <MediaReviewPlayer
          asset={reviewAsset as any}
          comments={comments}
          selectedTool={selectedTool}
          selectedColor={selectedColor}
          onTimeUpdate={setTimestamp}
          onDrawingShapeChange={(shape) => {
            // Usually shape updates continuously while drawing, when it stops (or based on user action)
            // we might want to trigger the composer. We'll rely on tapping a button for now.
            setDrawingShape(shape);
          }}
        />
      </View>

      <View style={styles.floatingPalette}>
        <ToolPalette
          selectedTool={selectedTool}
          onSelectTool={setSelectedTool}
          selectedColor={selectedColor}
          onSelectColor={setSelectedColor}
          onClear={() => setDrawingShape(null)}
        />
      </View>

      {drawingShape && !isComposerVisible && (
        <View style={styles.addAction}>
          <Pressable 
            style={styles.addCommentBtn}
            onPress={() => setComposerVisible(true)}
          >
            <Ionicons name="chatbubble" size={20} color="white" />
            <Text style={styles.addCommentText}>Add Comment</Text>
          </Pressable>
        </View>
      )}

      {isComposerVisible && (
        <ReviewComposer
          timestamp={reviewAsset.asset_type === 'video' ? timestamp : null}
          onSend={submitComment}
          onCancel={() => {
            setComposerVisible(false);
            setDrawingShape(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  headerTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    padding: 4,
  },
  playerContainer: {
    flex: 1,
    position: "relative",
  },
  floatingPalette: {
    position: "absolute",
    right: 16,
    top: "30%",
    zIndex: 50,
  },
  addAction: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    zIndex: 50,
  },
  addCommentBtn: {
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addCommentText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  }
});
