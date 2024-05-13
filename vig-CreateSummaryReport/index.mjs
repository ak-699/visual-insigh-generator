import { readFileSync, unlinkSync, writeFileSync, createWriteStream } from "node:fs";
import { downloadFile, uploadFile } from "./s3Utils.mjs"
import PDFDocument from "pdfkit";
import sizeOf from "image-size";

const VIDEO_PROCESSING_STAGING_PREFIX = "video-processing-staging";
const VIDEO_SUMMARY_FILES_PREFIX = "video-summary-files";
const VIDEO_PDF_REPORT_FILES_PREFIX = "video-pdfreport-files";

function enoughSpace(doc, height, leftMargin, rightMargin) {
    return doc.page.height - doc.y - (leftMargin + rightMargin) * 72 - height > 0;
}

const createPDFReport = async (event) => {
    const videoBucket = event[0]?.BatchInput.Video.S3Object.Bucket;
    const videoFileKey = event[0]?.BatchInput.Video.S3Object.Name;
    if (!videoBucket || !videoFileKey) return { "status": 401 };
    const videoFile = videoFileKey.split("/")[1];
    const videoName = videoFile.split(".")[0];

    const tmpPdfFilePath = `/tmp/${videoName}.pdf`;
    const s3PdfFile = `${VIDEO_PDF_REPORT_FILES_PREFIX}/${videoName}.pdf`;

    const doc = new PDFDocument({
        font: 'Times-Roman',
        size: 'A4',
    });
    const writeStream = createWriteStream(tmpPdfFilePath);
    const leftMargin = 1;
    const rightMargin = 1;
    const contentWidth = doc.page.width - (leftMargin + rightMargin) * 72;

    const Batches = event;
    for (const Batch of Batches) {
        for (const Segment of Batch.Items) {
            if (Segment['AudioOrVideoExists'] == "NO") {
                continue;
            }

            console.log(`Fetching summary and thumbnail files for: ${Segment}`);
            const index = Segment.ShotSegment.Index;
            const summaryFile = `${index}.txt`;
            const thumbnailFile = `${index}.jpg`;
            const summaryFilePath = `/tmp/${summaryFile}`;
            const thumbnailFilePath = `/tmp/${thumbnailFile}`;

            await downloadFile(videoBucket, `${VIDEO_SUMMARY_FILES_PREFIX}/${videoName}/${summaryFile}`, summaryFilePath)
            await downloadFile(videoBucket, `${VIDEO_SUMMARY_FILES_PREFIX}/${videoName}/${thumbnailFile}`, thumbnailFilePath)
            console.log("Downloaded: ", thumbnailFile, summaryFile);

            const summaryText = readFileSync(summaryFilePath).toString();
            const summaryTextHeight = doc.heightOfString(summaryText, { width: contentWidth });
            const imgD = sizeOf(thumbnailFilePath);
            const imgAR = imgD.width / imgD.height;
            const imgH = contentWidth / imgAR;
            if (!enoughSpace(doc, summaryTextHeight+imgH, leftMargin, rightMargin)) {
                doc.addPage();
            }
            doc.text(summaryText, leftMargin * 72).moveDown();
            doc.image(thumbnailFilePath, {
                width: contentWidth,
                height: imgH
            });
            doc.text("", leftMargin * 72, doc.y + imgH).moveDown();
            // unlinkSync(summaryFilePath);
            // unlinkSync(thumbnailFilePath)
        }

    }
    doc.pipe(writeStream);
    doc.end();

    await new Promise((resolve) => {
        writeStream.on('finish', async function() {
            console.log('PDF file has been created');
            await uploadFile(videoBucket, s3PdfFile, tmpPdfFilePath);
            resolve();
        })
    });
    console.log("Uploaded PDF")
    unlinkSync(tmpPdfFilePath)
}



export const handler = async (event) => {
    console.log(event[0].BatchInput.Video.S3Object.Bucket);
    await createPDFReport(event);
    return "Succesfully Created PDF Report";
}
