import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import {logger} from "./index.js";

const generatePDF = async (templateName, data, outputPath) => {
    try {
        const templatePath = path.resolve(`src/templates/${templateName}.hbs`);
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const compiledTemplate = handlebars.compile(templateContent);
        const html = compiledTemplate(data);
        console.log('html:::\n', html)
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(html);

        // Custom page size for 80mm x 297mm (48-column thermal paper)
        await page.pdf({
            path: outputPath,
            printBackground: true,
            preferCSSPageSize: true,
            width: '80mm',
        });

        await browser.close();
        // Remove 'src' from the path
        const publicPath = outputPath.replace(/^src[\\/]/, ''); // Remove 'src/' or 'src\\'

        logger.info(`PDF is generated at : ${outputPath}`)
        return publicPath;
    } catch (error) {
        console.log('error:::', error)
        throw new Error('Error generating PDF');
    }
};

export default generatePDF;
