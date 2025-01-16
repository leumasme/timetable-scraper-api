import { LectureData } from "./scraper.ts";


export type ParsedLectureData = LectureData & {
  cleanTitle: string;
  type: string[] | null;
  group: string | null;
  parsedDate: {
    start: string;
    end: string;
    info: string | null;
  } | null;
}
export function parseLectureData(lecture: LectureData): ParsedLectureData {
  const title = lecture.title;
  const type = parseType(lecture.title);

  const group = parseGroup(title);

  const cleanTitle = title
    .trim().replace(/  +/g, " ")
    .replace(typeRegex, "")
    .replace(groupRegex, "")
    .replace(descriptorRegex, "")
    .replaceAll(/\( *\)/g, "") // Remove empty braces
    .replace(/\.$/g, "") // Remove ending dot
    .trim().replace(/  +/g, " ");

  const parsedDate = parseDate(lecture.date);

  return {
    ...lecture,
    cleanTitle,
    type,
    group,
    parsedDate,
  };
}

const descriptors = ["Online", "Wiederholer", "Tutorium", "Zus."];
// TODO: Detect descriptors only if they are not preceeded/followed by a letter
const descriptorRegex = new RegExp(`\(${descriptors.join("|")}\)`, "ig");
// todo: parse descriptors? are they useful?

const lectureTypesRecord = {
  "V": "Vorlesung",
  "Ü": "Übung",
  "P": "Praktikum",
  "S": "Seminar",
  "Pj": "Projekt",
} as Record<string, string>;
const lectureTypes = Object.values(lectureTypesRecord);
// Match pair of braces() at the end of string, but make sure there's not another brace inside
const typeRegex = /\(([^\(]+)\)$/;
function parseType(title: string) {
  const type = title.match(typeRegex);
  if (!type) {
    console.warn("Lecture", title, "has no type");
    return null;
  }

  let typesArr = type[1].split(/\/|,|und/).map((t) => t.trim());
  let expandedTypes = typesArr.map((t) => lectureTypesRecord[t] ?? t);
  let isValid = expandedTypes.every((t) => lectureTypes.includes(t));

  if (isValid) return expandedTypes;

  // The types might be nothing-separated letters like "VÜ"
  typesArr = type[1].split("");
  expandedTypes = typesArr.map((t) => lectureTypesRecord[t] ?? t);
  isValid = expandedTypes.every((t) => lectureTypes.includes(t));

  if (!isValid) {
    console.warn("Failed to parse type", type[1]);
  }

  return expandedTypes;
}

const groupRegex = /Gr(?:\.| |\. )((?:Wdh\.? )?[a-z0-9\-]{1,6})/i;
function parseGroup(title: string) {
  const group = title.match(groupRegex);
  if (!group) {
    return null;
  }
  return group[1];
}

// Ex. "29.04.2024-08.07.2024 (gKW (ab KW18))"
const dateRegex = /([0-9.]+)-([0-9.]+)(?: \((.+)\))?/;
function parseDate(date: string) {
  const match = date.match(dateRegex);
  if (!match) {
    console.warn("Failed to parse date", date);
    return null;
  }
  return {
    start: match[1],
    end: match[2],
    info: match[3] as string | null,
  };
}
