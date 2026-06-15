import * as XLSX from "xlsx";

export const TICKET_EXCEL_HEADERS = [
  "Developer",
  "Project",
  "Category",
  "Ticket URL",
  "Date",
  "Total (h)",
  "Comment",
] as const;

export interface ExcelTicketRow {
  Developer: string;
  Project: string;
  Category: string;
  "Ticket URL": string;
  Date: string;
  "Total (h)": number | string;
  Comment: string;
}

export interface ResolvedTicket {
  category: "bug" | "feature";
  comment?: string;
  employeeId: string;
  processDate: string;
  projectId: string;
  ticketUrl: string;
  totalEffort?: number | null;
}

export function exportTicketsToExcel(
  rows: {
    category: string;
    comment: string | null | undefined;
    fullName: string;
    processDate: string;
    projectName: string;
    ticketUrl: string;
    totalEffort: number | null | undefined;
  }[],
  month: string
) {
  const data: ExcelTicketRow[] = rows.map((r) => ({
    Category: r.category,
    Comment: r.comment ?? "",
    Date: r.processDate,
    Developer: r.fullName,
    Project: r.projectName,
    "Ticket URL": r.ticketUrl,
    "Total (h)": r.totalEffort ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data, {
    header: [...TICKET_EXCEL_HEADERS],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tickets");
  XLSX.writeFile(wb, `tickets-${month}.xlsx`);
}

export function downloadTicketTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([[...TICKET_EXCEL_HEADERS]]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tickets");
  XLSX.writeFile(wb, "tickets-template.xlsx");
}

export interface ParseError {
  message: string;
  row: number;
}

export function parseTicketExcel(
  file: File,
  developers: { fullName: string; id: string }[],
  projects: { id: string; name: string }[],
  selfEmployeeId?: string
): Promise<{ errors: ParseError[]; tickets: ResolvedTicket[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]!];
        if (!ws) {
          resolve({
            errors: [{ message: "Empty workbook", row: 0 }],
            tickets: [],
          });
          return;
        }

        const rows = XLSX.utils.sheet_to_json<ExcelTicketRow>(ws, {
          defval: "",
        });

        const tickets: ResolvedTicket[] = [];
        const errors: ParseError[] = [];

        rows.forEach((row, i) => {
          const rowNum = i + 2;

          const category = String(row["Category"] ?? "").toLowerCase();
          if (category !== "bug" && category !== "feature") {
            errors.push({
              message: `Row ${rowNum}: Category must be "bug" or "feature"`,
              row: rowNum,
            });
            return;
          }

          const ticketUrl = String(row["Ticket URL"] ?? "").trim();
          if (!ticketUrl) {
            errors.push({
              message: `Row ${rowNum}: Ticket URL is required`,
              row: rowNum,
            });
            return;
          }

          const processDate = String(row["Date"] ?? "").trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(processDate)) {
            errors.push({
              message: `Row ${rowNum}: Date must be YYYY-MM-DD (got "${processDate}")`,
              row: rowNum,
            });
            return;
          }

          let employeeId: string;
          if (selfEmployeeId) {
            employeeId = selfEmployeeId;
          } else {
            const devName = String(row["Developer"] ?? "").trim();
            const dev = developers.find((d) => d.fullName === devName);
            if (!dev) {
              errors.push({
                message: `Row ${rowNum}: Developer "${devName}" not found`,
                row: rowNum,
              });
              return;
            }
            employeeId = dev.id;
          }

          const projectName = String(row["Project"] ?? "").trim();
          const proj = projects.find((p) => p.name === projectName);
          if (!proj) {
            errors.push({
              message: `Row ${rowNum}: Project "${projectName}" not found`,
              row: rowNum,
            });
            return;
          }

          const rawEffort = row["Total (h)"];
          const totalEffort =
            rawEffort !== "" && rawEffort != null
              ? Number(rawEffort)
              : undefined;

          tickets.push({
            category: category as "bug" | "feature",
            comment: String(row["Comment"] ?? "").trim() || undefined,
            employeeId,
            processDate,
            projectId: proj.id,
            ticketUrl,
            totalEffort:
              totalEffort != null && !isNaN(totalEffort)
                ? totalEffort
                : undefined,
          });
        });

        resolve({ errors, tickets });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
