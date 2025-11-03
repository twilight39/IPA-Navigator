import React, { useState } from "react";
import { useMutation } from "convex/react";
import { useFileUpload } from "../hooks/useFileUpload.tsx";
import { internal } from "../../convex/_generated/api.js";
import { Modal } from "./Modal.tsx";
import { Form } from "./FormComponents/Form.tsx";
import { FormInputField } from "./FormComponents/FormInputField.tsx";
import { FormUploadField } from "./FormComponents/FormUploadField.tsx";
import { FormTextAreaField } from "./FormComponents/FormTextAreaField.tsx";

type ChapterCreateModalProps = {};

export const ChapterCreateModal: React.FC<ChapterCreateModalProps> = ({}) => {
  const [uploadedFile, setUploadedFile] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const createChapter = useMutation(
    internal.functions.chapters.createChapter,
  );
  const { uploadFiles } = useFileUpload();

  const handleSubmit = async (event: React.FormEvent) => {
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const chapterName = formData.get("chapterName") as string;
    const description = formData.get("description") as string;
    const file = uploadedFile;

    let imageIds: string[] = [];
    console.log("Attempting to upload image");
    console.log(file);
    try {
      imageIds = await uploadFiles(file);
    } catch (error) {
      setError(
        `Failed to upload files: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }

    // console.log(imageIds);
    const imageId = imageIds[0] || undefined;
    // console.log(imageId);

    try {
      await createChapter(
        {
          name: chapterName,
          description: description,
          imageId: imageId,
        },
      );

      const modal = document.getElementById(
        "chapter_create_modal",
      ) as HTMLDialogElement;
      if (modal) {
        modal.close();
      }
    } catch (err) {
      setError(
        `Failed to create chapter: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  };

  return (
    <Modal id="chapter_create_modal">
      <Form
        title="Create Chapter"
        error={error}
        setError={setError}
        onSubmit={handleSubmit}
        modalID="chapter_create_modal"
      >
        <FormUploadField
          label="Chapter Cover"
          maxSize={1}
          onFilesChange={setUploadedFile}
          required={false}
        >
        </FormUploadField>
        <FormInputField name="chapterName" label="Chapter Name" required />
        <FormTextAreaField name="description" label="Description" />
      </Form>
    </Modal>
  );
};
