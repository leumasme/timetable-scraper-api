# Timetable Scraper API

This project does the following:

- Scrape the Timetable data of the HBRS University, located
  [here](https://eva2.inf.h-brs.de/stundenplan/)
  - Extract the data from HTML
  - and cache it for 1 hour
  - Only performed on incoming request, not on a strict schedule
- Preprocess it to make it easy to group events belonging to the same course
  - Normalize course names, detect type of events (lecture, exercise, ...)
- Serve the data as JSON
  - Request may take a few seconds to complete if the data isn't cached yet

This is my first proper Deno project because I wanted to try Deno!\
Run with `deno task start`

The schema of the response JSON as a typescript type is as follows:

```ts
type Response = {
  /** Hours:Minutes, ex `12:45` */
  startTime: string;
  /** Hours:Minutes, ex `12:45` */
  endTime: string;
  room: string;
  title: string; // Raw title as shown in the timetable
  /** Raw date string as given, ex `31.03.2025-30.06.2025 (KW 14-27)` */
  date: string;
  lecturer: string;
  weekday: string;
  /** Normalized title without event type and group info */ 
  cleanTitle: string; 
  /**
   * Types of the event, with common shortcodes expanded, or as-given in case of unknown type.  
   * Usually: `"Vorlesung" | "Übung" | "Praktikum" | "Seminar" | "Projekt"`  
   */
  type: string[] | null;
  /** If an event is split into multiple parts for separate student groups, which group is this event for? */
  group: string | null;
  parsedDate: {
    /** German date format, ex `31.03.2025` */
    start: string;
    /** German date format, ex `31.03.2025` */
    end: string;
    /** 
     * Ex. `KW 14-27`, `gKW (ab KW14)`
     * Commonly contains "gKW" for only even weeks, "uKW" for only odd weeks.
     */
    info: string | null; // Commonly contains "gKW" for only even weeks, "uKW" for only odd weeks
  } | null;
  /** Semester and Degree that this event belongs to, ex. `BI1`, `BCSP5` */
  semesterName: string;
}[]
```

### Issues

- The "All Weeks" mode of the official timetable excludes events of which the
  end date has already passed
  - In order to prevent the timetable from hiding all events as the last week of
    the semester passes, Events are requested for the last week instead of all
    weeks if the last week is the current week
  - Events which have already ended will still go missing outside of this
