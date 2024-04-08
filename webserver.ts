import { type FullLectureData, getAllSemesterData } from "./scraper.ts"; // Import the FullLectureData type

let lastScrape = 0;
let cachedData: FullLectureData[] = [];

export function startWebserver() {
  Deno.serve({
    port: 7299,
  }, async (req) => {
    // Have over 60 minutes passed since the last scrape?
    const isStale = Date.now() - lastScrape > 1000 * 60 * 60;
    if (isStale) {
      console.log("Scraping new data");
      cachedData = await getAllSemesterData();
      lastScrape = Date.now();
    }

    console.log("Serving request");
    return new Response(JSON.stringify(cachedData));
  });
  
  console.log("Webserver started on port 7299");
}
