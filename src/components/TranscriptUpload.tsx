"use client";

import {
  useState,
} from "react";

type Props = {
  onNewSummary: (
    summary: string
  ) => void;
};

export default function TranscriptUpload({
  onNewSummary,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null
  );

  const [
    generatedFileName,
    setGeneratedFileName,
  ] = useState("");

  const handleGenerate =
    async () => {
      // Prevent duplicate generation
      if (
        !selectedFile ||
        generatedFileName ===
          selectedFile.name
      ) {
        return;
      }

      setLoading(true);

      try {
        // Read uploaded file text
        const text =
          await selectedFile.text();

        // API call
        const response =
          await fetch(
            "/api/summary",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  transcript:
                    text,
                }
              ),
            }
          );

        const data =
          await response.json();

        // Update summary section
        if (
          data?.result
        ) {
          onNewSummary(
            data.result
          );

          // Save generated file name
          setGeneratedFileName(
            selectedFile.name
          );
        }
      } catch (error) {
        console.error(
          "Summary Error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="bg-white border rounded-2xl p-6 shadow-sm">
      <h2 className="text-3xl font-bold mb-6">
        Upload Transcript
      </h2>

      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        {/* File Upload */}
        <input
          type="file"
          accept=".txt"
          onChange={(e) => {
            const file =
              e.target
                .files?.[0] ||
              null;

            setSelectedFile(
              file
            );
          }}
          className="border p-2 rounded-lg"
        />

        {/* Generate Button */}
        <button
          onClick={
            handleGenerate
          }
          disabled={
            loading ||
            !selectedFile ||
            generatedFileName ===
              selectedFile.name
          }
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Generating..."
            : generatedFileName ===
              selectedFile?.name
            ? "Already Generated"
            : "Generate Summary"}
        </button>
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className="mt-4 text-sm text-gray-600">
          Selected File:{" "}
          <span className="font-medium">
            {
              selectedFile.name
            }
          </span>
        </div>
      )}

      {/* Success Message */}
      {generatedFileName ===
        selectedFile?.name && (
        <div className="mt-3 text-green-600 font-medium">
          Summary already generated for this file.
        </div>
      )}
    </div>
  );
}