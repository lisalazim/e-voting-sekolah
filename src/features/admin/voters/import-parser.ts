import ExcelJS from "exceljs";
import Papa from "papaparse";

import type { AdminVoter } from "./types";
import type { Gender, VoterImportPreview, VoterImportPreviewRow, VoterImportRow } from "./types";

export const VOTER_IMPORT_MAX_ROWS = 1500;
export const VOTER_IMPORT_MAX_FILE_SIZE = 2 * 1024 * 1024;
export const VOTER_IMPORT_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

type RawImportRow = {
  nama: string;
  kelas: string;
  jenis_kelamin: string;
  rowNumber: number;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeHeader(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function getGender(value: string): Gender | null {
  const normalized = value.trim().toUpperCase();

  return normalized === "L" || normalized === "P" ? normalized : null;
}

function normalizeDuplicateText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getDuplicateKey(nama: string, kelas: string): string {
  return `${normalizeDuplicateText(nama)}::${normalizeDuplicateText(kelas)}`;
}

function validateRawRow(row: RawImportRow): VoterImportPreviewRow {
  const gender = getGender(row.jenis_kelamin);
  const reasons: string[] = [];

  if (!row.nama) {
    reasons.push("Nama wajib diisi");
  }

  if (!row.kelas) {
    reasons.push("Kelas wajib diisi");
  }

  if (!gender) {
    reasons.push("Jenis kelamin wajib L atau P");
  }

  return {
    jenis_kelamin: gender ?? "L",
    kelas: row.kelas,
    nama: row.nama,
    reason: reasons.join(", "),
    rowNumber: row.rowNumber,
    status: reasons.length > 0 ? "invalid" : "valid",
  };
}

function buildPreview(
  rawRows: RawImportRow[],
  existingVoters: AdminVoter[],
): VoterImportPreview {
  const seenInFile = new Map<string, number>();
  const existingKeys = new Set(
    existingVoters.map((voter) =>
      getDuplicateKey(voter.full_name, voter.class_name ?? ""),
    ),
  );
  const rows = rawRows.map((row) => {
    const validated = validateRawRow(row);

    if (validated.status === "invalid") {
      return validated;
    }

    const duplicateKey = getDuplicateKey(validated.nama, validated.kelas);
    const firstSeenRow = seenInFile.get(duplicateKey);

    if (firstSeenRow) {
      return {
        ...validated,
        reason: `Kemungkinan duplikat nama dan kelas, pertama muncul pada baris ${firstSeenRow}`,
        status: "duplicate" as const,
      };
    }

    seenInFile.set(duplicateKey, validated.rowNumber);

    if (existingKeys.has(duplicateKey)) {
      return {
        ...validated,
        reason: "Kemungkinan duplikat nama dan kelas pada pemilihan ini",
        status: "duplicate" as const,
      };
    }

    return validated;
  });

  return {
    rows,
    summary: {
      duplicateCount: rows.filter((row) => row.status === "duplicate").length,
      invalidCount: rows.filter((row) => row.status === "invalid").length,
      validCount: rows.filter((row) => row.status === "valid").length,
    },
  };
}

function parseCsv(text: string): RawImportRow[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data.map((row, index) => ({
    jenis_kelamin: normalizeText(row.jenis_kelamin),
    kelas: normalizeText(row.kelas),
    nama: normalizeText(row.nama),
    rowNumber: index + 2,
  }));
}

function getCellText(row: ExcelJS.Row, columnIndex: number): string {
  const value = row.getCell(columnIndex).value;

  if (value && typeof value === "object" && "text" in value) {
    return normalizeText(value.text);
  }

  if (value && typeof value === "object" && "result" in value) {
    return normalizeText(value.result);
  }

  return normalizeText(value);
}

async function parseXlsx(file: File): Promise<RawImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return [];
  }

  const headers = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    headers.set(normalizeHeader(cell.value), columnNumber);
  });

  const namaColumn = headers.get("nama") ?? 1;
  const kelasColumn = headers.get("kelas") ?? 2;
  const genderColumn = headers.get("jenis_kelamin") ?? 3;
  const rows: RawImportRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const rawRow = {
      jenis_kelamin: getCellText(row, genderColumn),
      kelas: getCellText(row, kelasColumn),
      nama: getCellText(row, namaColumn),
      rowNumber,
    };

    if (
      rawRow.nama ||
      rawRow.kelas ||
      rawRow.jenis_kelamin
    ) {
      rows.push(rawRow);
    }
  });

  return rows;
}

export function getValidImportRows(preview: VoterImportPreview): VoterImportRow[] {
  return preview.rows
    .filter((row) => row.status === "valid")
    .map((row) => ({
      jenis_kelamin: row.jenis_kelamin,
      kelas: row.kelas,
      nama: row.nama,
    }));
}

export async function parseVoterImportFile(
  file: File,
  existingVoters: AdminVoter[],
): Promise<VoterImportPreview> {
  if (file.size > VOTER_IMPORT_MAX_FILE_SIZE) {
    throw new Error("Ukuran file maksimal 2 MB.");
  }

  const lowerName = file.name.toLowerCase();
  const rawRows = lowerName.endsWith(".csv")
    ? parseCsv(await file.text())
    : lowerName.endsWith(".xlsx")
      ? await parseXlsx(file)
      : null;

  if (!rawRows) {
    throw new Error("Format file harus .xlsx atau .csv.");
  }

  if (rawRows.length > VOTER_IMPORT_MAX_ROWS) {
    throw new Error("Maksimal 1.500 baris per file.");
  }

  return buildPreview(rawRows, existingVoters);
}
