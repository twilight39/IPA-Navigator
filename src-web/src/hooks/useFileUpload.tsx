// src/hooks/useFileUpload.tsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { internal } from "../../convex/_generated/api.js";
import { toast } from "sonner";

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const generateUploadUrls = useMutation(
    internal.functions.files.generateUploadUrls,
  );
  const deleteStorageIds = useMutation(
    internal.functions.files.deleteStorageIds,
  );

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    setIsUploading(true);
    setProgress(0);

    const progressId = "upload-progress";
    toast.loading(`Preparing to upload ${files.length} files...`, {
      id: progressId,
    });

    const successfulStorageIds: string[] = [];

    try {
      // Generate upload URLs
      const uploadUrls = await generateUploadUrls({ count: files.length });

      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        toast.loading(
          `Uploading file ${i + 1} of ${files.length}: ${file.name}`,
          {
            id: progressId,
          },
        );

        try {
          // Upload the file
          const response = await fetch(uploadUrls[i], {
            method: "POST",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload file: ${file.name}`);
          }

          // Get the storage ID from the response
          const storageId = await response.json();
          successfulStorageIds.push(storageId.storageId);

          // Update progress
          setProgress(Math.round(((i + 1) / files.length) * 100));
          toast.success(`Uploaded ${file.name}`, { id: progressId });
        } catch (error) {
          // Roll back if any upload fails
          if (successfulStorageIds.length > 0) {
            toast.loading(`Upload failed. Rolling back...`, {
              id: progressId,
            });
            await deleteStorageIds({ storageIds: successfulStorageIds });
          }
          toast.dismiss(progressId);
          setIsUploading(false);
          throw error;
        }
      }

      toast.success(`Successfully uploaded ${files.length} files`, {
        id: progressId,
      });
      toast.dismiss(progressId);
      setIsUploading(false);
      return successfulStorageIds;
    } catch (error) {
      toast.dismiss(progressId);
      setIsUploading(false);
      throw error;
    }
  };

  return {
    uploadFiles,
    isUploading,
    progress,
  };
}
