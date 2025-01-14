import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

const generatePDF = async (templateName, data, outputPath) => {
    try {
        const templatePath = path.resolve(`src/templates/${templateName}.hbs`);
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const compiledTemplate = handlebars.compile(templateContent);
        const html = compiledTemplate(data);

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(html);

        await page.pdf({ path: outputPath, format: 'A4' });
        await browser.close();

        return outputPath;
    } catch (error) {
        throw new Error('Error generating PDF');
    }
};

export default generatePDF;
