'use strict';

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const uuidv5 = require('uuid').v5;
const namespace = uuidv5("yanlin.sun/bookeditor", uuidv5.DNS);
const util = require('./util.js');

class ZipBook {
    constructor(book) {
        this.book = book;
        this.filename = null;
    }

    delete() {
        fs.unlink(this.filename, err => {
            if (err) {
                throw err;
            }
        });
    }

    async saveTo(dir) {
        this.filename = path.join(dir, this.book.title + ".zip");
        let i = 1;
        while (fs.existsSync(this.filename)) {
            this.filename = path.join(dir, this.book.title + '-' + i++ + ".zip");
        }
        let zip = new JSZip();
        this.saveMetaInf(zip);
        this.saveMimeType(zip);
        this.saveContentOpf(zip);
        this.saveToc(zip);
        this.saveChapters(zip);
        await this.copyCss(zip);
        await this.makeZipFile(this.filename, zip);
    }

    async copyCss(zip) {
        let folder = zip.folder("html");
        let css = await util.readFile('./resources/stylesheet.css');
        this.writeFile("stylesheet.css", css, folder);
    }

    async makeZipFile(file, zip) {
        await new Promise((resolve, reject) => {
            zip
                .generateNodeStream({type: "nodebuffer", streamFiles: true})
                .pipe(fs.createWriteStream(file))
                .on('finish', () => resolve(true))
                .on('error', e => reject(e));
        });
    }

    saveMetaInf(zip) {
        let folder = zip.folder("META-INF");
        this.writeFile("container.xml", this.buildMetaInf(), folder);
    }

    saveMimeType(zip) {
        this.writeFile("mimetype", this.buildMimeType(), zip);
    }

    saveContentOpf(zip) {
        this.writeFile("content.opf", this.buildContentOpf(), zip);
    }

    saveToc(zip) {
        let folder = zip.folder("html");
        this.writeFile("part0000.html", this.buildToc(), folder);
    }

    saveChapters(zip) {
        let folder = zip.folder("html");
        let i = 0;
        for(var chapter of this.book.chapters.values()) {
            let filename = "part" + new String(++i).padStart(4, '0') + ".html";
            this.writeFile(filename, this.buildChapter(chapter), folder);
        }
    }

    writeFile(filename, content, zip) {
        zip.file(filename, content);
    }

    buildChapter(chapter) {
        let html = [];
        html.push("<div class=\"calibreMain\">");
        html.push("  <div class=\"calibreEbookContent\">");
        let heading = chapter.indent ? "h3" : "h2";
        html.push("  <" + heading + " id=\"" + chapter.id + "\" class=\"calibre3\">" + chapter.title + "</" + heading + ">");
        html.push(chapter.content);
        html.push("  </div>");
        return this.buildHtml(html);
    }

    buildToc() {
        let html = [];
        html.push("  <div class=\"calibreToc\">");
        html.push("    <h1>" + this.book.title + "</h1>");
        html.push("    <div>");
        html.push("      <ul>");
        html.push("        <li><a href=\"part0000.html\">封面</a></li>");
        let i = 0;
        for(let chapter of this.book.chapters.values()) {
        html.push("        <li><a href=\"part" + new String(++i).padStart(4, '0') + ".html\">" + chapter.title + "</a></li>");
        }
        html.push("      </ul>");
        html.push("    </div>");
        html.push("  </div>");
        html.push("</div>");
        return this.buildHtml(html);
    }

    buildMetaInf() {
        var content = [];
        content.push("<?xml version=\"1.0\"?>");
        content.push("<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">");
        content.push("   <rootfiles>");
        content.push("      <rootfile full-path=\"content.opf\" media-type=\"application/oebps-package+xml\"/>");
        content.push("   </rootfiles>");
        content.push("</container>");
        return content.join("\r\n");
    }

    buildMimeType() {
        return "application/epub+zip";
    }

    buildContentOpf() {
        var content = [];
        content.push("<?xml version='1.0' encoding='utf-8'?>");
        content.push("<package xmlns=\"http://www.idpf.org/2007/opf\" unique-identifier=\"uuid_id\" version=\"2.0\">");
        content.push("  <opf:metadata xmlns:calibre=\"http://calibre.kovidgoyal.net/2009/metadata\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dcterms=\"http://purl.org/dc/terms/\" xmlns:opf=\"http://www.idpf.org/2007/opf\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">");
        content.push("    <opf:meta name=\"calibre:timestamp\" content=\"2020-03-28T09:49:54.609846+00:00\"/>");
        content.push("    <dc:creator>" + this.book.author + "</dc:creator>");
        content.push("    <dc:identifier id=\"uuid_id\" opf:scheme=\"uuid\">" + this.uuid(this.book.title) + "</dc:identifier>");
        content.push("    <dc:title>" + this.book.title + "</dc:title>");
        content.push("    <dc:language>zh-CN</dc:language>");
        content.push("  </opf:metadata>");
        content.push("  <manifest>");
        content.push("    <item href=\"html/part0000.html\" id=\"part0000.html\" media-type=\"application/xhtml+xml\"/>");
        for(let i = 0; i < this.book.chapters.size; i++) {
            let seq = new String(i + 1).padStart(4, '0');
        content.push("    <item href=\"html/part" + seq + ".html\" id=\"part" + seq + ".html\" media-type=\"application/xhtml+xml\"/>");
        }
        content.push("    <item href=\"toc.ncx\" id=\"ncx\" media-type=\"application/x-dtbncx+xml\"/>");
        content.push("  </manifest>");
        content.push("  <spine toc=\"ncx\">");
        content.push("    <itemref idref=\"part0000.html\"/>");
        for(let i = 0; i < this.book.chapters.size; i++) {
        content.push("    <itemref idref=\"part" + new String(i + 1).padStart(4, '0') + ".html\"/>");
        }
        content.push("  </spine>");
        content.push("  <guide/>");
        content.push("</package>");
        return content.join("\r\n");
    }

    buildHtml(content) {
        let html = [];
        html.push("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">");
        html.push("<html xmlns=\"http://www.w3.org/1999/xhtml\">");
        html.push("<head>");
        html.push("    <title>" + this.book.title + "</title>");
        html.push("    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"/>");
        html.push("    <link href=\"stylesheet.css\" rel=\"stylesheet\" type=\"text/css\"/>");
        html.push("</head>");
        html.push("<body>");
        content.map(c => html.push(c));
        html.push("</body>");
        html.push("</html>");
        return html.join("\r\n");
    }

    uuid(title) {
        return uuidv5(title, namespace);
    }

}

module.exports = ZipBook;
