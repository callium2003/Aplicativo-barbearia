export type OperationalExportPayload = Record<string, unknown> & {
  generated_at?: string;
  barbershop?: { name?: string | null; slug?: string | null };
};

export type OperationalExportArchive = {
  bytes: Uint8Array;
  entries: Map<string, Uint8Array>;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function xml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function display(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function columnName(index: number) {
  let current = index + 1;
  let name = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255);
}

function u32(value: number) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
}

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function zip(entries: Map<string, Uint8Array>) {
  const files: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const filename = encoder.encode(name);
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(filename.length), u16(0), filename, data,
    ]);
    files.push(local);
    central.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(filename.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), filename,
    ]));
    offset += local.length;
  }
  const centralBytes = concat(central);
  return concat([...files, centralBytes, u32(0x06054b50), u16(0), u16(0), u16(entries.size), u16(entries.size), u32(centralBytes.length), u32(offset), u16(0)]);
}

type Sheet = { name: string; rows: Record<string, unknown>[] };

function normalizeRows(value: unknown) {
  if (Array.isArray(value)) return value.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
  if (value && typeof value === "object") return [value as Record<string, unknown>];
  return [];
}

function sheetXml(rows: Record<string, unknown>[]) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const rowValues = columns.length ? [Object.fromEntries(columns.map((column) => [column, column])), ...rows] : [{ Informação: "Sem registros" }];
  const xmlRows = rowValues.map((row, rowIndex) => {
    const cells = Object.entries(row).map(([, value], columnIndex) => {
      const style = rowIndex === 0 ? ' s="1"' : "";
      return `<c r="${columnName(columnIndex)}${rowIndex + 1}" t="inlineStr"${style}><is><t>${xml(display(value))}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
}

function xlsx(sheets: Sheet[]) {
  const entries = new Map<string, Uint8Array>();
  entries.set("[Content_Types].xml", encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`));
  entries.set("_rels/.rels", encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`));
  entries.set("xl/workbook.xml", encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`));
  entries.set("xl/_rels/workbook.xml.rels", encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`));
  entries.set("xl/styles.xml", encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" applyFont="1"/></cellXfs></styleSheet>`));
  sheets.forEach((sheet, index) => entries.set(`xl/worksheets/sheet${index + 1}.xml`, encoder.encode(sheetXml(sheet.rows))));
  return zip(entries);
}

function sheetsFor(payload: OperationalExportPayload): Sheet[] {
  const keys: Array<[string, string]> = [
    ["Agendamentos", "appointments"], ["Clientes", "customers"], ["Permissões de contato", "customer_consents"], ["Serviços", "services"], ["Profissionais", "professionals"], ["Comissões", "commissions"], ["Horários", "business_hours"], ["Disponibilidade", "professional_hours"], ["Pausas", "professional_breaks"], ["Ausências", "professional_time_blocks"], ["Equipe", "team_members"], ["Cadastro", "registration"],
  ];
  return [
    { name: "Resumo", rows: [{ gerado_em: payload.generated_at ?? "", barbearia: payload.barbershop?.name ?? "", identificador_publico: payload.barbershop?.slug ?? "" }] },
    ...keys.map(([name, key]) => ({ name, rows: normalizeRows(payload[key]) })),
  ];
}

export async function buildOperationalExport(payload: OperationalExportPayload): Promise<OperationalExportArchive> {
  const json = encoder.encode(JSON.stringify(payload, null, 2));
  const workbook = xlsx(sheetsFor(payload));
  const entries = new Map<string, Uint8Array>([["dados-operacionais.json", json], ["operacao.xlsx", workbook]]);
  return { bytes: zip(entries), entries };
}

export function makeOperationalExportFilename(payload: OperationalExportPayload) {
  const slug = (payload.barbershop?.slug || "barbearia").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const date = (payload.generated_at || new Date().toISOString()).slice(0, 10);
  return `barbeariasp-${slug}-${date}.zip`;
}

export function zipStartsWithPk(bytes: Uint8Array) {
  return decoder.decode(bytes.slice(0, 2)) === "PK";
}
