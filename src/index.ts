import { writeFileSync, mkdirSync, existsSync } from "fs";

const BOOK_NAME = "Operating Systems: Three Easy Pieces";
const PAGE_URL = "https://pages.cs.wisc.edu/~remzi/OSTEP";

type ChapterInfo = ReturnType<typeof parseTableDataRow>;

function parseTableDataRow(td: string) {
  const chapterNumber =
    parseInt(td.slice(td.indexOf("<small>") + 7, td.indexOf("</small>"))) || -1;
  const chapterLinkTag = td.slice(td.indexOf("<a"), td.indexOf("</a>"));

  let chapterName = chapterLinkTag.includes("<i>")
    ? chapterLinkTag.slice(
        chapterLinkTag.indexOf("<i>") + 3,
        chapterLinkTag.indexOf("</i>")
      )
    : chapterLinkTag.slice(chapterLinkTag.lastIndexOf(">") + 1);

  const chapterLink = `${PAGE_URL}/${chapterLinkTag.slice(
    chapterLinkTag.indexOf("href=") + 5,
    chapterLinkTag.indexOf(".pdf")
  )}.pdf`;

  return {
    chapterLinkTag,
    chapterLink,
    chapterNumber,
    chapterName: `[${
      chapterNumber > -1 && chapterNumber < 10
        ? "0" + chapterNumber
        : chapterNumber
    }] ${chapterName}`.replace(/\//g, "\u2215"),
  };
}

async function getAllChapters(chapters: ChapterInfo[]) {
  if (!existsSync(`${BOOK_NAME}`)) mkdirSync(BOOK_NAME);

  while (chapters.length > 0) {
    const chaptersToDownload = chapters.splice(0, 20);
    const promiseResult = await Promise.allSettled(
      chaptersToDownload.map(async ({ chapterName, chapterLink }) => {
        console.log(`Fetching ${chapterName}`, chapterLink);
        const arrayBuffer = await (await fetch(chapterLink)).arrayBuffer();
        writeFileSync(
          `${BOOK_NAME}/${chapterName}.pdf`,
          Buffer.from(arrayBuffer)
        );
      })
    );

    for (const [index, result] of promiseResult.entries()) {
      if (result.status === "rejected") {
        console.log(
          "Failed to fetch",
          chaptersToDownload[index].chapterName,
          result.reason
        );
        chapters.push(chaptersToDownload[index]);
      }
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.floor(Math.random() * 2000))
    );
  }
}

async function main() {
  const pageContent = await (await fetch(PAGE_URL)).text();

  const chapters: ChapterInfo[] = [];

  let searchOffset = 0;
  while (searchOffset < pageContent.length) {
    const tdStart = pageContent.indexOf("<td", searchOffset);
    const tdEnd = pageContent.indexOf("</td>", tdStart + 2);

    if (tdStart === -1 || tdEnd === -1) {
      break;
    }

    const td = pageContent.slice(tdStart, tdEnd + 6).trim();
    if (td.includes(".pdf")) {
      chapters.push(parseTableDataRow(td));
    }

    searchOffset = tdEnd + 5;
  }

  chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

  await getAllChapters(chapters);
}

await main();
