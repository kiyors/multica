package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/multica-ai/multica/server/internal/storage"
	"github.com/multica-ai/multica/server/internal/util"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

type VideoMetadata struct {
	Width    int32
	Height   int32
	Duration float32
	HasAudio bool
}

func getVideoMetadata(inputURL string) (*VideoMetadata, error) {
	cmd := exec.Command("ffprobe", "-v", "error", "-print_format", "json", "-show_streams", inputURL)
	out, err := cmd.Output()
	if err != nil {
		var stderr string
		if ee, ok := err.(*exec.ExitError); ok {
			stderr = string(ee.Stderr)
		}
		return nil, fmt.Errorf("ffprobe failed: %v, stderr: %s", err, stderr)
	}

	var data struct {
		Streams []struct {
			CodecType string `json:"codec_type"`
			Width     int32  `json:"width"`
			Height    int32  `json:"height"`
			Duration  string `json:"duration"`
		} `json:"streams"`
	}
	if err := json.Unmarshal(out, &data); err != nil {
		return nil, err
	}

	meta := &VideoMetadata{}
	for _, stream := range data.Streams {
		if stream.CodecType == "video" {
			meta.Width = stream.Width
			meta.Height = stream.Height
			if stream.Duration != "" {
				if d, err := strconv.ParseFloat(stream.Duration, 32); err == nil {
					meta.Duration = float32(d)
				}
			}
		}
		if stream.CodecType == "audio" {
			meta.HasAudio = true
		}
	}

	return meta, nil
}

func (h *Handler) processVideoAsync(assetID pgtype.UUID, fileKey string) {
	slog.Info("starting background transcode", "asset_id", util.UUIDToString(assetID))

	// Get a presigned URL valid for 4 hours
	presigner, ok := h.Storage.(storage.Presigner)
	if !ok {
		slog.Error("storage does not support presigning, cannot transcode")
		return
	}
	inputURL, err := presigner.PresignGet(context.Background(), fileKey, 4*time.Hour)
	if err != nil {
		slog.Error("failed to presign input url", "err", err)
		return
	}

	meta, err := getVideoMetadata(inputURL)
	if err != nil {
		slog.Error("failed to get video metadata", "err", err)
		return
	}

	// Create temp dir
	tmpDir, err := os.MkdirTemp("", "transcode_*")
	if err != nil {
		slog.Error("failed to create temp dir", "err", err)
		return
	}
	defer os.RemoveAll(tmpDir)

	hlsDir := filepath.Join(tmpDir, "hls")
	os.Mkdir(hlsDir, 0755)
	
	// Create resolution folders
	os.Mkdir(filepath.Join(hlsDir, "720p"), 0755)
	os.Mkdir(filepath.Join(hlsDir, "480p"), 0755)

	ffmpegArgs := []string{
		"-y", "-i", inputURL,
		"-filter_complex", "[v:0]split=2[v1][v2];[v1]scale=1280:720:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2[720p];[v2]scale=854:480:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2[480p]",
		"-map", "[720p]",
	}
	if meta.HasAudio {
		ffmpegArgs = append(ffmpegArgs, "-map", "a:0")
	}
	ffmpegArgs = append(ffmpegArgs,
		"-c:v:0", "libx264", "-crf", "22", "-preset", "fast", "-force_key_frames", "expr:gte(t,n_forced*2)",
		"-map", "[480p]",
	)
	if meta.HasAudio {
		ffmpegArgs = append(ffmpegArgs, "-map", "a:0")
	}
	ffmpegArgs = append(ffmpegArgs,
		"-c:v:1", "libx264", "-crf", "26", "-preset", "fast", "-force_key_frames", "expr:gte(t,n_forced*2)",
		"-f", "hls",
		"-hls_time", "2",
		"-hls_playlist_type", "vod",
		"-hls_flags", "independent_segments",
		"-hls_segment_type", "mpegts",
		"-master_pl_name", "master.m3u8",
	)

	varStreamMap := "v:0 v:1"
	if meta.HasAudio {
		varStreamMap = "v:0,a:0 v:1,a:1"
	}
	ffmpegArgs = append(ffmpegArgs, "-var_stream_map", varStreamMap)
	
	ffmpegArgs = append(ffmpegArgs, 
		"-hls_segment_filename", filepath.Join(hlsDir, "%v", "seg_%03d.ts"),
		filepath.Join(hlsDir, "%v", "playlist.m3u8"),
	)

	cmd := exec.Command("ffmpeg", ffmpegArgs...)
	if out, err := cmd.CombinedOutput(); err != nil {
		slog.Error("ffmpeg transcode failed", "err", err, "output", string(out))
		return
	}

	// Generate Thumbnail
	thumbPath := filepath.Join(tmpDir, "thumb.jpg")
	thumbCmd := exec.Command("ffmpeg", "-y", "-i", inputURL, "-ss", "00:00:01.000", "-vframes", "1", "-q:v", "2", thumbPath)
	thumbCmd.Run() // ignore error, if it fails we just don't upload thumbnail

	slog.Info("ffmpeg transcode complete, uploading to s3")

	baseKey := "reviews/" + util.UUIDToString(assetID)
	masterM3u8Key := baseKey + "/hls/master.m3u8"
	
	// Upload HLS
	filepath.Walk(hlsDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		rel, _ := filepath.Rel(hlsDir, path)
		s3Key := baseKey + "/hls/" + rel
		
		data, err := os.ReadFile(path)
		if err != nil {
			return nil
		}
		
		contentType := "video/MP2T"
		if strings.HasSuffix(path, ".m3u8") {
			contentType = "application/vnd.apple.mpegurl"
		}
		
		h.Storage.Upload(context.Background(), s3Key, data, contentType, info.Name())
		return nil
	})

	// Upload Thumbnail
	var thumbKey *string
	if thumbData, err := os.ReadFile(thumbPath); err == nil {
		tKey := baseKey + "/thumbnail.jpg"
		h.Storage.Upload(context.Background(), tKey, thumbData, "image/jpeg", "thumbnail.jpg")
		thumbKey = &tKey
	}

	// Update Database
	ctx := context.Background()
	params := db.UpdateReviewAssetMetadataParams{
		ID:        assetID,
		FileUrl:   masterM3u8Key,
		Width:     pgtype.Int4{Int32: meta.Width, Valid: meta.Width > 0},
		Height:    pgtype.Int4{Int32: meta.Height, Valid: meta.Height > 0},
		Duration:  pgtype.Float4{Float32: meta.Duration, Valid: meta.Duration > 0},
	}
	if thumbKey != nil {
		params.ThumbnailUrl = pgtype.Text{String: *thumbKey, Valid: true}
	}

	if err := h.Queries.UpdateReviewAssetMetadata(ctx, params); err != nil {
		slog.Error("failed to update review asset after transcode", "err", err)
	} else {
		slog.Info("transcode and db update successful", "asset_id", util.UUIDToString(assetID))
	}
}
