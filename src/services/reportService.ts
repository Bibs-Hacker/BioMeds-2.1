import { rpc } from "./supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { groupBy } from "../utils/analytics";
import type { Student } from "../types";
export function reportRows(students: Student[]) {
  return students.map((s) => ({
    "Full name": s.full_name,
    "Registration number": s.registration_number,
    Gender: s.gender,
    County: s.county,
    "Admission year": s.admission_year,
    "Academic year": s.academic_year,
    "Registration status": s.registration_status,
    "Membership status": s.membership_status,
    "Membership ID": s.membership_id,
  }));
}
export function excelReport(students: Student[], title: string) {
  const sheet = XLSX.utils.json_to_sheet(reportRows(students), {
    origin: "A7",
  });
  XLSX.utils.sheet_add_aoa(
    sheet,
    [
      [title],
      ["KMTC • Medical Engineering • Year 2 Semester 1"],
      [`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`],
      [`Records: ${students.length}`],
      [
        `Academic year(s): ${[...new Set(students.map((s) => s.academic_year))].join(", ") || "No records"}`,
      ],
    ],
    { origin: "A1" },
  );
  sheet["!cols"] = [{ wch: 28 }, { wch: 24 }, ...Array(7).fill({ wch: 20 })];
  const book = XLSX.utils.book_new();
  const summary = XLSX.utils.json_to_sheet(
    (["gender", "county", "admission_year"] as const).flatMap((key) =>
      groupBy(students, key).map((v) => ({
        Dimension: key,
        Group: v.name,
        Students: v.value,
      })),
    ),
  );
  XLSX.utils.book_append_sheet(book, summary, "Population summaries");
  XLSX.utils.book_append_sheet(book, sheet, "Class register");
  XLSX.writeFile(book, "medeng-class-report.xlsx");
}
export function pdfReport(students: Student[], title: string, print = false) {
  const pdf = new jsPDF({ orientation: "landscape" });
  pdf.setFontSize(18);
  pdf.text(title, 14, 18);
  pdf.setFontSize(10);
  pdf.text(
    `KMTC | Medical Engineering | Year 2 Semester 1 | ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
    14,
    26,
  );
  pdf.text(
    `Records: ${students.length} | Approved: ${students.filter((s) => s.registration_status === "approved").length} | Active: ${students.filter((s) => s.membership_status === "active").length}`,
    14,
    33,
  );
  pdf.text(
    `Academic year(s): ${[...new Set(students.map((s) => s.academic_year))].join(", ") || "No records"}`,
    14,
    39,
  );
  const data = reportRows(students);
  autoTable(pdf, {
    startY: 45,
    head: [Object.keys(data[0] || reportRows([{} as Student])[0])],
    body: data.map(Object.values),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 49, 85] },
    didDrawPage: () => {
      pdf.setFontSize(8);
      pdf.text(
        "Confidential class register • Developed and Managed by Dev Brian",
        14,
        200,
      );
    },
  });
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.text("Population distribution summaries", 14, 18);
  autoTable(pdf, {
    startY: 26,
    head: [["Dimension", "Group", "Students"]],
    body: (["gender", "county", "admission_year"] as const).flatMap((key) =>
      groupBy(students, key).map((v) => [key, v.name, v.value]),
    ),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [13, 49, 85] },
  });
  if (print) {
    pdf.autoPrint();
    window.open(pdf.output("bloburl"), "_blank", "noopener");
  } else pdf.save("medeng-class-report.pdf");
}

export async function loadReportRegister(): Promise<Student[]> {
  const result: Student[] = [];
  for (let offset = 0; ; offset += 500) {
    const batch = await rpc<Student[]>("report_register", {
      page_offset: offset,
    });
    result.push(...batch);
    if (batch.length < 500) return result;
  }
}
