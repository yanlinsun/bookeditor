'use strict';

const path = require('path');
const fs = require('fs');

class HtmlBook {
    constructor(book) {
        this.book = book;
    }

    delete() {
        fs.unlink(this.filename, err => {
            if (err) {
                throw err;
            }
        });
    }

    async saveTo(dir) {
        this.filename = path.join(dir, this.book.title + ".html");
        let i = 1;
        while (fs.existsSync(this.filename)) {
            this.filename = path.join(dir, this.book.title + '-' + i++ + ".html");
        }
        let content = this.buildHtml();
        await new Promise((resolve, reject) => {
            fs.writeFile(this.filename, content, "utf8", err => {
                if (err) {
                    throw err;
                }
                resolve(true);
            });    
        });
    }

    buildChapter(chapter, html) {
        html.push("    <div class=\"chapter\">");
        let heading = chapter.indent ? "h3" : "h2";
        html.push("        <" + heading + " id=\"" + chapter.id + "\" class=\"calibre3\">" + chapter.title + "</" + heading + ">");
        html.push(chapter.content);
        html.push("    </div>");
    }

    buildHtml() {
        let html = [];
        html.push("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">");
        html.push("<html xmlns=\"http://www.w3.org/1999/xhtml\">");
        html.push("<head>");
        html.push("    <title>" + this.book.title + "</title>");
        html.push("    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"/>");
        this.buildCss(html);
        html.push("</head>");
        html.push("<body>");
        Array.from(this.book.chapters.values()).map(c => this.buildChapter(c, html));
        html.push("</body>");
        html.push("</html>");
        return html.join("\r\n");
    }

    buildCss(html) {
        html.push("    <style type=\"text/css\">");
		html.push("@page {");
		html.push("    margin-bottom: 5pt;");
		html.push("    margin-top: 5pt");
		html.push("}");
		html.push("");
		html.push("body {");
		html.push("    margin:0px;");
		html.push("    padding: 0.5em;");
		html.push("    font-size:1em;");
		html.push("}");
		html.push("");
		html.push("h1 {");
		html.push("    margin:0px;");
		html.push("    font-size:2em;");
		html.push("    font-weight: bold;");
		html.push("}");
		html.push("");
		html.push("h2 {");
		html.push("    margin:0px;");
		html.push("    font-size:1.5em;");
		html.push("    font-weight: bold;");
		html.push("}");
		html.push("");
		html.push("h3 {");
		html.push("    margin:0px;");
		html.push("    font-size:1.2em;");
		html.push("}");
		html.push("");
		html.push("chapter {");
		html.push("    padding: 20px;");
		html.push("}");
		html.push("");
        html.push("    </style");
    }
}

module.exports = HtmlBook;
