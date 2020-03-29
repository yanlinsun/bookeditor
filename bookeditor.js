'use strict';

const fs = require('fs');
const path = require('path');
const dd = require('./util/dragdrop.js');
const Book = require('./book.js');
const bookhtml = require('./bookhtml.js');
const JSZip = require('jszip');

class BookEditor {
    constructor(dir) {
        this.root = dir;
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
        this.clearMessage();
    }

    save() {
        if (this.currentBook) {
            this.saveBook(this.currentBook);
        } else {
            this.message("Please select a book first");
        }
    }

    saveBook(book) {
        let file = path.join(this.root, book.title + ".zip");
        this.reorder(book);
        let zip = new JSZip();
        this.saveMetaInf(book, zip);
        this.saveMimeType(book, zip);
        this.saveContentOpf(book, zip);
        this.saveToc(book, zip);
        this.saveChapters(book, zip);
        this.makeZipFile(file, zip);
    }

    makeZipFile(file, zip) {
        zip
            .generateNodeStream({type: "nodebuffer", streamFiles: true})
            .pipe(fs.createWriteStream(file))
            .on('finish', () => {
                this.message("Saved to file " + file);
            });
    }

    saveMetaInf(book, zip) {
        let folder = zip.folder("META-INF");
        this.writeFile("container.xml", bookhtml.buildMetaInf(book), folder);
    }

    saveMimeType(book, zip) {
        this.writeFile("mimetype", bookhtml.buildMimeType(book), zip);
    }

    saveContentOpf(book, zip) {
        this.writeFile("content.opf", bookhtml.buildContentOpf(book), zip);
    }

    saveToc(book, zip) {
        let folder = zip.folder("html");
        this.writeFile("part0000.html", bookhtml.buildToc(book), folder);
    }

    saveChapters(book, zip) {
        let folder = zip.folder("html");
        let i = 0;
        for(var chapter of book.chapters.values()) {
            let filename = "part" + new String(++i).padStart(4, '0') + ".html";
            this.writeFile(filename, bookhtml.buildChapter(book, chapter), folder);
        }
    }

    writeFile(filename, content, zip) {
        zip.file(filename, content);
    }

    reorder(book) {
        let table = this.tocTable();
        let orderedChapter = new Map();
        Array.from(table.rows).forEach((tr, i) => {
            let id = tr.cells[0].id;
            let chapter = book.chapters.get(id);
            chapter.indent = tr.cells[0].classList.contains("indent");
            orderedChapter.set(id, chapter);
        });
        book.chapters = orderedChapter;
    }

    showBook(book) {
        this.clear();
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
