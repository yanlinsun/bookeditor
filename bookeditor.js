'use strict';

const fs = require('fs');
const path = require('path');
const dd = require('./util/dragdrop.js');
const Book = require('./book.js');
const uuidv5 = require('uuid').v5;
const namespace = uuidv5("yanlin.sun/bookeditor", uuidv5.DNS);

class BookEditor {
    constructor(dir) {
        this.bookDict = new Map();
        this.currentBook = null;
        this.loadBooks(dir);
    }

    async loadBooks(dir) {
        let loading = new Promise((resolve, reject) => {
            fs.readdir(dir, { withFileTypes: false }, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(files);
                }

            });
        });
        let files = await loading;
        let htmls = files.filter(f => f.endsWith(".html"));
        return this.list(dir, htmls);
    }

    list(dir, files) {
        let list = document.getElementById("book_list");
        for(let f of files) {
            let row = list.insertRow();
            let cell = row.insertCell();
            cell.innerText = f;
            cell.onclick = (e) => {
                let td = e.srcElement;
                let cells = td.closest("table").querySelectorAll("td.selected");
                Array.from(cells).forEach(c => c.classList.remove("selected"));
                td.classList.add("selected");
                this.parseBook(path.join(dir, f));
            }
        }
    }

    async parseBook(fullpath) {
        let book = this.bookDict.get(fullpath);
        if (book) {
            this.showBook(book);
        } else {
            let readFile = new Promise((resolve, reject) => {
                fs.readFile(fullpath, "utf-8", (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });
            let data = await readFile;
            if (data.indexOf("<meta name=\"generator\" content=\"webscraper\"") > 0) {
                let dom = new DOMParser().parseFromString(data, "text/html");
                try {
                    let book = new Book(dom, path.basename(fullpath, ".html"));
                    this.bookDict.set(fullpath, book);
                    this.showBook(book);
                } catch (e) {
                    console.error(e);
                    this.message(e.toString());
                }
            } else {
                this.message("This is not a valid book");
            }
        }
    }

    message(msg) {
        document.getElementById("message").innerHTML = msg;
        document.getElementById("book").classList.add("hide");
        document.getElementById("message").classList.remove("hide");
    }

    clearMessage() {
        document.getElementById("message").classList.add("hide");
        document.getElementById("book").classList.remove("hide");
    }

    clear() {
        let table = this.tocTable();
        table.deleteCaption();
        if (table.firstElementChild) {
            table.removeChild(table.firstElementChild);
        }
        this.setPreviewContent("");
    }

    save(book) {
        this.reorder(book);
        this.saveMetaInf(book);
        this.saveMimetype(book);
        this.saveContentOpf(book);
        this.saveHtml(book);
    }

    saveMetaInf(book) {
        var content = [];
		content.push("<?xml version=\"1.0\"?>");
		content.push("<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">");
		content.push("   <rootfiles>");
		content.push("      <rootfile full-path=\"content.opf\" media-type=\"application/oebps-package+xml\"/>");
		content.push("   </rootfiles>");
		content.push("</container>");
        writeFile("META-INF/content.opf", content.join("\r\n"));
    
    }

    saveMimeType(book) {
        writeFile("mimetype", "application/epub+zip");
    }

    saveContentOpf(book) {
        var content = [];
		content.push("<?xml version='1.0' encoding='utf-8'?>");
		content.push("<package xmlns=\"http://www.idpf.org/2007/opf\" unique-identifier=\"uuid_id\" version=\"2.0\">");
		content.push("  <opf:metadata xmlns:calibre=\"http://calibre.kovidgoyal.net/2009/metadata\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dcterms=\"http://purl.org/dc/terms/\" xmlns:opf=\"http://www.idpf.org/2007/opf\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">");
		content.push("    <opf:meta name=\"calibre:timestamp\" content=\"2020-03-28T09:49:54.609846+00:00\"/>");
		content.push("    <dc:creator>Unknown</dc:creator>");
		content.push("    <dc:identifier id=\"uuid_id\" opf:scheme=\"uuid\">" + uuid(book.title) + "</dc:identifier>");
		content.push("    <dc:title>" + book.title + "</dc:title>");
		content.push("    <dc:language>zh-CN</dc:language>");
		content.push("  </opf:metadata>");
		content.push("  <manifest>");
        for(let i = 0; i < book.chapters.length; i++) {
		    content.push("    <item href=\"part" + new String(i).padStart(4, '0') + ".html\" id=\"html\" media-type=\"application/xhtml+xml\"/>");
        }
		content.push("    <item href=\"toc.ncx\" id=\"ncx\" media-type=\"application/x-dtbncx+xml\"/>");
		content.push("  </manifest>");
		content.push("  <spine toc=\"ncx\">");
        for(let i = 0; i < book.chapters.length; i++) {
		    content.push("    <itemref idref=\"part" + new String(i).padStart(4, '0') + ".html\"/>");
        }
		content.push("  </spine>");
		content.push("  <guide/>");
		content.push("</package>");
        writeFile("content.opf", content.join("\r\n"));
    }

    uuid(title) {
        return uuidv5(title, namespace);
    }

    saveHtml(book) {
        let i = 0;
        for(var chapter of book.chapters.values()) {
            writeFile("part" + new String(++i).padStart(4, '0') + ".html", chapter.content);
        }
    }

    writeFile(filename, content) {
        fs.writeFile(filename, content, "utf-8", (err) => {
            if (err) {
                console.error(err);
                this.message(err.toString());
            } else {
                this.message("File saved!");
            }
        });
    }

    reorder() {
        let table = this.tocTable();
        let bookToc = this.book.querySelector("div.toc tbody");
        let bookContent = this.book.querySelector("div.content");
        Array.from(table.rows).forEach((tr, i) => {
            let id = tr.cells[0].id;
            let bookLink = bookToc.querySelector("a[href='#" + id + "']").closest("tr");
            bookToc.insertBefore(bookLink, null);
            if (tr.cells[0].classList.contains("indent")) {
                bookLink.cells[0].classList.add("indent");
            } else {
                bookLink.cells[0].classList.remove("indent");
            }
            let content = bookContent.querySelector("div[id='" + id + "']");
            bookContent.insertBefore(content, null);
        });
    }

    showBook(book) {
        this.clearMessage();
        this.currentBook = book;
        this.showTitle(book.title);
        this.showToc(book.chapters);
    }

    showTitle(title) {
        let table = this.tocTable();
        let c = table.createCaption();
        c.innerHTML = title;
    }

    showToc(chapters) {
        let table = this.tocTable();
        table.innerHTML = "";
        for(let chapter of chapters.values()) {
            let row = table.insertRow();
            let cell = row.insertCell();
            cell.classList.add("toc");
            cell.id = chapter.id;
            if (chapter.indent) {
                cell.classList.add("indent");
            }
            cell.onclick = () => this.selectToc(cell.id);
            let c = document.createElement("SPAN");
            c.innerHTML = chapter.title;
            c.ondblclick = () => this.editToc(cell.id);
            cell.appendChild(c);
            this.addTocButton(cell, "delete", this.deleteToc);
            if (chapter.indent) {
                this.addTocButton(cell, "format_indent_decrease", this.indentOutToc);
            } else {
                this.addTocButton(cell, "format_indent_increase", this.indentInToc);
            }
        }
        dd.draggable(table);
    }

    indentOutToc(id) {
        let cell = this.tocCell(id);
        let indent = cell.classList.contains("indent");
        if (indent) {
            cell.classList.remove("indent");
            this.removeTocButton(cell, "format_indent_decrease");
            this.addTocButton(cell, "format_indent_increase", this.indentInToc);
        }
    }

    indentInToc(id) {
        let cell = this.tocCell(id);
        let indent = cell.classList.contains("indent");
        if (!indent) {
            cell.classList.add("indent");
            this.removeTocButton(cell, "format_indent_increase");
            this.addTocButton(cell, "format_indent_decrease", this.indentOutToc);
        }
    }

    removeTocButton(cell, name) {
        let btn = cell.querySelector("button[name='" + name + "']");
        cell.removeChild(btn);
    }

    addTocButton(cell, name, fn) {
        let btn = document.createElement("BUTTON");
        btn.name = name;
        btn.innerText = name;
        btn.classList.add("button-primary");
        btn.classList.add("material-icons");
        btn.onclick = () => {
            event.stopPropagation();
            fn.apply(this, [cell.id]);
        };
        cell.appendChild(btn);
    }

    editToc(id) {
        let cell = this.tocCell(id);
        let text = cell.querySelector("SPAN");
        text.classList.add("hide");
        let input = document.createElement("INPUT");
        input.type = "text";
        input.value = text.innerHTML;
        input.classList.add("fill_available");
        input.style.color = "black";
        input.onkeydown = e => {
            if (e.key == "Enter") {
                if (e.defaultPrevented) { return; }
                if (e.target.value != "") {
                    this.changeTocText(id, e.target.value);
                }
                cell.removeChild(input);
                input.onkeydown = null;
                input.onblur = null;
                text.classList.remove("hide");
                e.preventDefault();
            }
        };
        input.onblur = e => {
            if (e.target.value != "") {
                this.changeTocText(id, e.target.value);
            }
            cell.removeChild(input);
            input.onkeydown = null;
            input.onblur = null;
            text.classList.remove("hide");
        };
        cell.appendChild(input);
        input.focus();
    }

    changeTocText(id, value) {
        let cell = this.tocCell(id);
        let text = cell.querySelector("SPAN");
        text.innerHTML = value;
        let chapter = this.currentBook.chapters.get(id);
        chapter.title = value;
    }

    deleteToc(id) {
        let row = this.tocCell(id).parentNode;
        row.parentNode.removeChild(row);
        this.currentBook.chapters.delete(id);
    }

    selectToc(id) {
        let table = this.tocTable();
        // unselect other toc
        let cells = table.querySelectorAll("td.selected");
        Array.from(cells).forEach(c => c.classList.remove("selected"));

        let cell = this.tocCell(id);
        cell.classList.add("selected");

        this.showPreview(id);
    }

    showPreview(id) {
        let chapter = this.currentBook.chapters.get(id);
        this.setPreviewContent(chapter.content);
    }

    setPreviewContent(content) {
        let preview = document.getElementById("preview_container");
        preview.innerHTML = content;
    }

    tocCell(id) {
        return this.tocTable().querySelector("td[id='" + id + "']");
    }

    tocTable() {
        return document.getElementById("book_toc");
    }
}

module.exports = BookEditor;
