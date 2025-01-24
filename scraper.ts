import {
  DOMParser,
  Element,
  Node,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { parseLectureData } from "./heuristics.ts";
import { ParsedLectureData } from "./heuristics.ts";

const baseUrl = "https://eva2.inf.h-brs.de/stundenplan/";
async function getParams() {
  const res = await fetch(baseUrl);
  const dom = new DOMParser().parseFromString(await res.text(), "text/html");
  if (!dom) throw new Error("Failed to parse document");

  // const weeks = dom.querySelector("#input_weeks > option[selected]")!
  //   .getAttribute("value")!;
  // HACK: Table-view does not show events in the past if multiple weeks are selected
  // For now, just select the last week if that is the current week.
  const week_options = dom.querySelector("#input_weeks")!.children
  let week_option: Element
  if (week_options[week_options.length-1].textContent.includes("aktuell")) {
    // Current week is last week, pick last week
    week_option = week_options[week_options.length-1]
  } else {
    // Current weeks is not last week, pick all weeks
    week_option = week_options[0]
  }
  const weeks = week_option.getAttribute("value")!

  const semesterElems = Array.from(
    dom.querySelectorAll("#identifier_semester > option")!,
  ) as Element[];

  const semesters = semesterElems
    .map((s) => [s.textContent, s.getAttribute("value")])
    .filter((v) => v[1] != null && v[1].length > 0) as [string, string][];

  const term = dom.querySelector("input[name=term]")!.getAttribute("value")!;

  return {
    params: {
      weeks,
      days: "1-7", // Mon-Sun
      term,
      mode: "table",
      identifier_dozent: "",
      identifier_raum: "",
      show_semester: "",
    },
    semesters,
  };
}

const classToName = {
  "liste-startzeit": "startTime",
  "liste-endzeit": "endTime",
  "liste-raum": "room",
  "liste-veranstaltung": "title",
  "liste-beginn": "date",
  "liste-wer": "lecturer",
} as const;
type ClassName = keyof typeof classToName;
type FieldName = typeof classToName[ClassName];
export type LectureData = Record<FieldName | "weekday", string>;
const columnCount = Object.keys(classToName).length;

async function getLectureData(params: Record<string, string>) {
  const url = new URL(baseUrl + "anzeigen/");
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  console.log("Using URL", url.toString());
  const res = await fetch(url);
  const text = await res.text();
  const dom = new DOMParser().parseFromString(text, "text/html");
  if (!dom) throw new Error("Failed to parse document");

  const table = dom.querySelector("table > tbody");
  const rows = Array.from(table!.children).slice(1);

  const events: LectureData[] = [];

  let currentDay = "";
  for (const row of rows) {
    if (row.children[0].getAttribute("rowspan")) {
      currentDay = row.children[0].textContent;
    }

    const attributes = Array.from(row.children)
      .filter((elem) => elem.className in classToName)
      .map((elem) => [
        classToName[elem.className as keyof typeof classToName],
        elem.textContent,
      ]);

    if (attributes.length != columnCount) {
      throw Error(
        `Failed to parse row, expected ${columnCount} attributes, got ${attributes.length}`,
      );
    }

    const attributesRecord = Object.fromEntries(attributes) as Record<
      FieldName,
      string
    >;

    events.push({
      weekday: currentDay,
      ...attributesRecord,
    });
  }

  return events;
}

export type FullLectureData = ParsedLectureData & { semesterName: string }
export async function getAllSemesterData() {
  const { params, semesters } = await getParams();

  const allData: FullLectureData[] = [];

  for (const [semesterName, semesterId] of semesters) {
    const data = await getLectureData({
      ...params,
      identifier_semester: semesterId,
    });

    const cleanedData = data.map((lecture) => ({
      semesterName,
      ...parseLectureData(lecture),
    }));

    allData.push(...cleanedData);
  }

  return allData;
}
