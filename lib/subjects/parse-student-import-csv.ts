export type StudentImportCsvRow = {
  className: string;
  email: string | null;
  firstName: string;
  preferredName: string | null;
  rowNumber: number;
  status: "active";
  studentId: string | null;
  surname: string;
};

export type StudentImportCsvIssue = {
  message: string;
  rowNumber: number | null;
};

export type StudentImportCsvParseResult = {
  errors: StudentImportCsvIssue[];
  rows: StudentImportCsvRow[];
  rowsParsed: number;
  warnings: StudentImportCsvIssue[];
};

const canonicalHeaders = [
  "student_id",
  "first_name",
  "preferred_name",
  "surname",
  "email",
  "class",
  "status",
] as const;

type CanonicalHeader = (typeof canonicalHeaders)[number];

type ParsedCsvDataRow = {
  error: string | null;
  rowNumber: number;
  valuesByHeader: Partial<Record<CanonicalHeader, string>>;
};

const requiredHeaders = new Set<CanonicalHeader>([
  "first_name",
  "surname",
  "class",
]);

const headerAliases: Record<string, CanonicalHeader> = {
  class: "class",
  class_code: "class",
  email: "email",
  first_name: "first_name",
  last_name: "surname",
  preferred_name: "preferred_name",
  status: "status",
  student_code: "student_id",
  student_id: "student_id",
  surname: "surname",
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  if (inQuotes) {
    return {
      cells: [],
      error: "Quoted cell is missing a closing quote.",
    };
  }

  cells.push(currentCell.trim());

  return { cells, error: null };
}

function normalizeHeader(header: string) {
  return headerAliases[header.trim().toLowerCase()] ?? null;
}

function getCell(
  valuesByHeader: Partial<Record<CanonicalHeader, string>>,
  header: CanonicalHeader,
) {
  return valuesByHeader[header]?.trim() ?? "";
}

function getDuplicateStudentIds(parsedRows: ParsedCsvDataRow[]) {
  const rowNumbersByStudentId = new Map<string, number[]>();

  for (const parsedRow of parsedRows) {
    if (parsedRow.error) {
      continue;
    }

    const studentId = getCell(parsedRow.valuesByHeader, "student_id");

    if (!studentId) {
      continue;
    }

    const normalizedStudentId = studentId.toLowerCase();
    const rowNumbers = rowNumbersByStudentId.get(normalizedStudentId) ?? [];

    rowNumbersByStudentId.set(normalizedStudentId, [
      ...rowNumbers,
      parsedRow.rowNumber,
    ]);
  }

  return new Set(
    [...rowNumbersByStudentId.entries()]
      .filter(([, rowNumbers]) => rowNumbers.length > 1)
      .map(([studentId]) => studentId),
  );
}

export function parseStudentImportCsv(
  csvText: string,
  activeClassNames: Set<string>,
): StudentImportCsvParseResult {
  const errors: StudentImportCsvIssue[] = [];
  const warnings: StudentImportCsvIssue[] = [];
  const nonBlankLines = csvText
    .split(/\r?\n/)
    .map((line, index) => ({
      line,
      rowNumber: index + 1,
    }))
    .filter(({ line }) => line.trim().length > 0);

  if (nonBlankLines.length === 0) {
    return {
      errors: [{ message: "CSV header row is required.", rowNumber: null }],
      rows: [],
      rowsParsed: 0,
      warnings,
    };
  }

  const parsedHeader = parseCsvLine(nonBlankLines[0].line);

  if (parsedHeader.error) {
    return {
      errors: [
        { message: parsedHeader.error, rowNumber: nonBlankLines[0].rowNumber },
      ],
      rows: [],
      rowsParsed: 0,
      warnings,
    };
  }

  const canonicalHeadersByIndex = parsedHeader.cells.map(normalizeHeader);
  const presentHeaders = new Set(
    canonicalHeadersByIndex.filter(
      (header): header is CanonicalHeader => header !== null,
    ),
  );
  const unknownHeaders = parsedHeader.cells.filter(
    (header) => normalizeHeader(header) === null,
  );

  if (presentHeaders.size === 0) {
    errors.push({
      message:
        "CSV header row must include named columns such as first_name, surname and class.",
      rowNumber: nonBlankLines[0].rowNumber,
    });
  } else if (unknownHeaders.length > 0) {
    warnings.push({
      message: `Extra columns ignored: ${unknownHeaders.join(", ")}.`,
      rowNumber: nonBlankLines[0].rowNumber,
    });
  }

  for (const requiredHeader of requiredHeaders) {
    if (!presentHeaders.has(requiredHeader)) {
      errors.push({
        message: `Missing required header: ${requiredHeader}.`,
        rowNumber: nonBlankLines[0].rowNumber,
      });
    }
  }

  if (errors.length > 0) {
    return {
      errors,
      rows: [],
      rowsParsed: Math.max(nonBlankLines.length - 1, 0),
      warnings,
    };
  }

  const rows: StudentImportCsvRow[] = [];
  const parsedRows = nonBlankLines
    .slice(1)
    .map<ParsedCsvDataRow>(({ line, rowNumber }) => {
      const parsedRow = parseCsvLine(line);
      const valuesByHeader: Partial<Record<CanonicalHeader, string>> = {};

      if (parsedRow.error) {
        return {
          error: parsedRow.error,
          rowNumber,
          valuesByHeader,
        };
      }

      canonicalHeadersByIndex.forEach((header, index) => {
        if (!header) {
          return;
        }

        valuesByHeader[header] = parsedRow.cells[index]?.trim() ?? "";
      });

      return {
        error: null,
        rowNumber,
        valuesByHeader,
      };
    });
  const duplicateStudentIds = getDuplicateStudentIds(parsedRows);

  for (const { error, rowNumber, valuesByHeader } of parsedRows) {
    if (error) {
      errors.push({ message: error, rowNumber });
      continue;
    }

    const studentId = getCell(valuesByHeader, "student_id");
    const firstName = getCell(valuesByHeader, "first_name");
    const preferredName = getCell(valuesByHeader, "preferred_name");
    const surname = getCell(valuesByHeader, "surname");
    const email = getCell(valuesByHeader, "email");
    const className = getCell(valuesByHeader, "class");
    const status = getCell(valuesByHeader, "status") || "active";
    const rowErrors: string[] = [];

    if (!firstName) {
      rowErrors.push("Missing first_name.");
    }

    if (!surname) {
      rowErrors.push("Missing surname.");
    }

    if (!className) {
      rowErrors.push("Missing class.");
    } else if (!activeClassNames.has(className.toLowerCase())) {
      rowErrors.push(`Unknown active class: ${className}.`);
    }

    if (status.toLowerCase() !== "active") {
      rowErrors.push(`Unsupported status: ${status}.`);
    }

    if (studentId) {
      const normalizedStudentId = studentId.toLowerCase();

      if (duplicateStudentIds.has(normalizedStudentId)) {
        rowErrors.push(
          `Duplicate student_id in CSV: ${studentId}. All rows with this student_id were skipped.`,
        );
      }
    } else {
      warnings.push({
        message: "Missing student_id. A new student identity may be created.",
        rowNumber,
      });
    }

    if (!email) {
      warnings.push({
        message: "Email is blank.",
        rowNumber,
      });
    }

    if (rowErrors.length > 0) {
      rowErrors.forEach((message) => errors.push({ message, rowNumber }));
      continue;
    }

    rows.push({
      className,
      email: email || null,
      firstName,
      preferredName: preferredName || null,
      rowNumber,
      status: "active",
      studentId: studentId || null,
      surname,
    });
  }

  return {
    errors,
    rows,
    rowsParsed: Math.max(nonBlankLines.length - 1, 0),
    warnings,
  };
}
