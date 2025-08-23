import { SpreadsheetEditor } from "@/components/spreadsheets/spreadsheet-editor";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SpreadsheetsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
