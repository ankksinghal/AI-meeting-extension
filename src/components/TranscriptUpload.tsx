"use client";

import { useState } from "react";

export default function TranscriptUpload() {
  const [file, setFile] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState("");

const handleUpload = async () => {
  if (!file) return;

  try {
    setLoading(true);

    console.log("Reading file...");

    const transcript =
      await file.text();

    console.log(
      "Transcript:",
      transcript
    );

    const response = await fetch(
      "/api/summary",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          transcript,
        }),
      }
    );

    console.log(
      "Response:",
      response
    );

    const data =
      await response.json();

    console.log("Data:", data);

    setResult(data.result);
  } catch (error) {
    console.error(
      "Upload Error:",
      error
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="mt-8 bg-white border rounded-2xl p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-4">
        Upload Transcript
      </h2>

      <input
        type="file"
        accept=".txt"
        onChange={(e) =>
          setFile(
            e.target.files?.[0] || null
          )
        }
      />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        {loading
          ? "Processing..."
          : "Generate Summary"}
      </button>

      {result && (
        <div className="mt-6 whitespace-pre-wrap bg-gray-100 p-4 rounded-xl">
          {result}
        </div>
      )}
    </div>
  );
}