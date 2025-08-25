"use client";

import { SpreadsheetEditor } from "@/components/spreadsheets/spreadsheet-editor";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function SpreadsheetsPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Spreadsheets</h1>
        <p className="text-muted-foreground">Create and manage spreadsheets</p>
      </div>

      <SpreadsheetEditor
        documentId="new-spreadsheet"
        onSave={(data) => {
          console.log("Spreadsheet saved:", data);
        }}
      />
    </div>
  );
}
