// deno run -A --unstable --import-map .\import_map.json .\chabot.ts
import { config, puppeteer } from "./deps.ts";

config({ safe: true, export: true });

const banda = "elvis+presley";
// const td = new TextDecoder();
// const dec = (b: Uint8Array) => td.decode(b);
// const URL = "https://soundcloud.com/";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (minimum: number, maximum: number) =>
  Math.floor((Math.random() * (maximum - minimum + 1)) + minimum);

const browser = await puppeteer.launch({
  executablePath:
    "E:\\scoop_apps\\apps\\chromium\\98.0.4758.82-r950365\\chrome.exe",
  headless: false,
});
// console.log(browser)
const page = await browser.newPage();

await page.setExtraHTTPHeaders({
  "Accept-Language": "en-US",
});

// await page.goto("this.url", {
//     waitUntil: 'networkidle2'
// })
await page.setViewport({ width: 1280, height: 610 });

await page.goto(`https://soundcloud.com/search?q=${banda}`, {
  waitUntil: "networkidle2",
});

// accept cookies

// click first result
await page.waitForSelector(".sc-link-dark", { timeout: 2500 }).catch(
  console.error,
);
await page.$$eval(".sc-link-dark", (e) => e[0].click());
await page.waitForSelector(".spotlight", { timeout: 2500 }).catch(
  console.error,
);
console.log(page.url());

await page.goto(page.url() + "/popular-tracks", {
  waitUntil: "networkidle2",
});

await page.waitForSelector(".soundList__item", { timeout: 2500 }).catch(
  console.error,
);

const popular = await page.waitForSelector(".userMain__content").catch(
  console.error,
);
const popular_links = await popular?.evaluate((el) => {
  return Array.from(el.querySelectorAll(".soundList__item")).map((e: any) => ({
    href: e.querySelector(".sc-link-primary").getAttribute("href"),
    // if there is no text push raw for now!.
    raw: e.querySelector(".sc-link-primary").textContent,
    text: e.querySelector(".sc-link-primary").textContent.match(/\s+(.+)\n\s+/)
      ?.[1],
    track: `https://w.soundcloud.com/player/?url=https://soundcloud.com${
      e.querySelector(".sc-link-primary").getAttribute("href")
    }`,
  }));
});

console.log(popular_links);
Deno.writeTextFileSync(
  `tracks-${banda}.json`,
  JSON.stringify(popular_links, null, 2),
);

await page.waitForSelector(".infoStats", { timeout: 2500 }).catch(
  console.error,
);
const info = await page.$eval(
  ".infoStats",
  (e) => {
    return e.querySelector(".truncatedUserDescription__content")?.outerHTML;
  },
);
// console.log("info?", info);
// await sleep(50000);

if (!info) {
  await page.close();
  await browser.close();
}

const info_html = await page.evaluate((el) => el.innerHTML, info);
await info.dispose?.();
// const value = await info?.evaluate((el) => el.innerHTML);

// console.log(info_html);
Deno.writeTextFileSync(`info-${banda}.html`, info.toString());

await page.waitForSelector(".web-profiles", { timeout: 2500 }).catch(
  console.error,
);
const links = await page.waitForSelector(
  ".web-profiles",
  { timeout: 2500 },
).catch(
  console.error,
);
const links_values = await links?.evaluate((el) =>
  Array.from(el.querySelectorAll(".web-profile")).map((e: any) => ({
    href: decodeURIComponent(
      e.getAttribute("href").substring(20).split("&", 1)[0],
    ),
    text: e.text.match(/\w+/)?.[0],
  }))
);
console.log(links_values);
Deno.writeTextFileSync(
  `social-${banda}.json`,
  JSON.stringify(links_values, null, 2),
);

const insta = links_values?.find(({ text }) =>
  text.toLowerCase() === "instagram"
);

// browser.close();
if (!insta) await browser.close();

await page.goto("https://www.instagram.com", {
  waitUntil: "networkidle2",
  timeout: 3500,
});

await page.waitForSelector("input[name=username]", { visible: true }).catch(
  console.error,
);

const user = Deno.env.get("INSTAGRAM_USER");
const pass = Deno.env.get("INSTAGRAM_PASS");

if (!user || !pass) {
  browser.close();
  Deno.exit(1);
}

await sleep(rand(200, 350));
await page.type("input[name=username]", user, { delay: 100 });

await sleep(rand(400, 600));
await page.type("input[name=password]", pass, {
  delay: rand(150, 220),
});

await sleep(rand(600, 800));
// const [ signup ] = await page.$x('//button[contains(.,"Log in")]')
// await Promise.all([
//   page.waitForNavigation(),
//   signup.click({ delay: rand(30, 60) })
// ])

await page.mouse.click(800, 290);

// => https://www.instagram.com/ (main feed)

await sleep(rand(3000, 4500));

await page.goto(insta!.href, {
  waitUntil: "networkidle2",
});

const photos = await page.waitForSelector(
  "#react-root > section > main article",
).catch(
  console.error,
);
const photos_urls = await photos?.evaluate((el) => {
  return Array.from(el.getElementsByTagName("img")).map((
    e: any,
  ) => [
    e.getAttribute("src").split("&")?.[0]?.split("?", 1)?.[0],
    e.getAttribute("src").split("&")?.[0],
    e.getAttribute("src"),
  ]);
});

console.log(photos_urls);
Deno.writeTextFileSync(
  `photos-${banda}.json`,
  JSON.stringify(photos_urls, null, 2),
);

await page.close();
await browser.close();
