import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

const inputPath = process.argv[2];
const outputDirArg = process.argv[3];

if (!inputPath) {
  console.error("Usage: node scripts/extract-manual-quotation.mjs <pdf-path> [output-dir]");
  process.exit(1);
}

const outputDir = outputDirArg
  ? path.resolve(outputDirArg)
  : path.resolve("tmp", "manual-quotation-extract");

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const saveScreenshots = async (parser, assetDir) => {
  const screenshotResult = await parser.getScreenshot({ desiredWidth: 1600 });

  await Promise.all(
    screenshotResult.pages.map((page, index) =>
      fs.writeFile(path.join(assetDir, `page-${index + 1}.png`), page.data)
    )
  );

  return screenshotResult.pages.map((page, index) => ({
    page: index + 1,
    width: page.width,
    height: page.height,
    fileName: `page-${index + 1}.png`,
  }));
};

const saveEmbeddedImages = async (parser, assetDir) => {
  const imageResult = await parser.getImage({ imageThreshold: 24 });
  const images = [];

  for (const [pageIndex, page] of imageResult.pages.entries()) {
    for (let index = 0; index < page.images.length; index += 1) {
      const image = page.images[index];
      const inferredPage = typeof page.page === "number" ? page.page : pageIndex + 1;
      const fileName = `embedded-page-${inferredPage}-image-${index + 1}.${image.type || "png"}`;
      await fs.writeFile(path.join(assetDir, fileName), image.data);
      images.push({
        page: inferredPage,
        width: image.width,
        height: image.height,
        type: image.type,
        fileName,
      });
    }
  }

  return images;
};

const main = async () => {
  const resolvedInput = path.resolve(inputPath);
  const pdfBuffer = await fs.readFile(resolvedInput);

  await ensureDir(outputDir);
  const assetDir = path.join(outputDir, "assets");
  await ensureDir(assetDir);

  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  const textResult = await parser.getText();
  const infoResult = await parser.getInfo({ parsePageInfo: true });
  const screenshots = await saveScreenshots(parser, assetDir);
  const images = await saveEmbeddedImages(parser, assetDir);

  await parser.destroy();

  await fs.writeFile(path.join(outputDir, "text.txt"), textResult.text || "", "utf8");
  await fs.writeFile(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(
      {
        input: resolvedInput,
        pages: infoResult.total,
        info: infoResult.info,
        pageInfo: infoResult.pages,
        screenshots,
        images,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        outputDir,
        pages: infoResult.total,
        textFile: path.join(outputDir, "text.txt"),
        manifestFile: path.join(outputDir, "manifest.json"),
        screenshotCount: screenshots.length,
        imageCount: images.length,
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});