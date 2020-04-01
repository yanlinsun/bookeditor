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
        html.push("    <div id=\"" + chapter.id + "\" class=\"content\">");
        let heading = chapter.indent > 0 ? "h" + (chapter.indent + 1) : "h2";
        html.push("      <" + heading + " indent=\"" + (chapter.indent ? chapter.indent : 0) + "\" class=\"chapter\">" + chapter.title + "</" + heading + ">");
        html.push("      <div class=\"text\">");
        html.push(chapter.content);
        html.push("      </div>");
        html.push("    </div>");
    }

    buildHtml() {
        let html = [];
        html.push("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">");
        html.push("<html xmlns=\"http://www.w3.org/1999/xhtml\">");
        html.push("<head>");
        html.push("  <meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"/>");
        html.push("  <link rel=\"schema.DC\" href=\"http://purl.org/dc/elements/1.1/\" />");
        html.push("  <title>" + this.book.title + "</title>");
        html.push("  <meta name=\"generator\" content=\"bookeditor\">");
        html.push("  <meta name=\"DC.creator\" content=\"" + this.book.author + "\">");
        html.push("  <meta name=\"DC.language\" content=\"zho\">");
        html.push("  <meta name=\"DC.contributor\" content=\"BookEditor\" />");
        if (this.book.date) 
        html.push("  <meta name=\"DC.date\"  content=\"" + this.book.date + "\" />");
        html.push("  <meta name=\"DC.title\"  content=\"" + this.book.title + "\" />");
        if (this.book.publisher)
        html.push("  <meta name=\"DC.publisher\"  content=\"" + this.book.publisher + "\" />");
        if (this.book.tags)
        html.push("  <meta name=\"DC.subject\"  content=\"" + this.book.tags + "\" />");
        this.buildCss(html);
        html.push("</head>");
        html.push("<body>");
        //this.buildToc(html);
        html.push("  <div class=\"main\">");
        Array.from(this.book.chapters.values()).map(c => this.buildChapter(c, html));
        html.push("  </div>");
        html.push("</body>");
        html.push("</html>");
        return html.join("\n");
    }

    buildToc(html) {
        html.push("  <div class=\"toc\">");
        html.push("    <table>");
        Array.from(this.book.chapters.values()).map(c => {
        html.push("      <tr><td> " + 
            (c.indent > 0 ? "<span class=\"indent" + c.indent + "\"></span>" : ""));
        html.push("        <a href=\"#" + c.id + "\" target=\"_self\">" + c.title + "</a>");
        html.push("      </td></tr>");
        });
        html.push("    </table>");
        html.push("  </div>");
    }

    buildCss(html) {
        html.push("  <style type=\"text/css\">");
		html.push("    body {");
		html.push("      font-size:1em;");
		html.push("    }");
		html.push("");
		html.push("    h1 {");
		html.push("      font-size:2em;");
		html.push("      font-weight: bold;");
		html.push("    }");
		html.push("");
		html.push("    h2 {");
		html.push("      font-size:1.5em;");
		html.push("      font-weight: bold;");
		html.push("    }");
		html.push("");
		html.push("    h3 {");
		html.push("      font-size:1.2em;");
		html.push("    }");
		html.push("");
        html.push("    .intent { padding-left: 2em; }");
        html.push("    .intent1 { padding-left: 2em; }");
        html.push("    .intent2 { padding-left: 4em; }");
        html.push("    p { text-indent: 2em; }");
        html.push("  </style>");
    }
}

module.exports = HtmlBook;
