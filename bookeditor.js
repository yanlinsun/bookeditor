'use strict';

const fs = require('fs');
const path = require('path');
const dd = require('./util/dragdrop.js');
const Book = require('./book.js');
const EditorSavedBook = require('./editorsavedbook.js');
const ui = require('./ui.js');
const util = require('./util.js');
const ZipBook = require('./zipbook.js');
const HtmlBook = require('./htmlbook.js');

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
        try {
            if (!book) {
                let data = await util.readFile(fullpath);
                if (data.indexOf("<meta name=\"generator\" content=\"webscraper\"") > 0) {
                    let dom = new DOMParser().parseFromString(data, "text/html");
                    book = new Book(dom, path.basename(fullpath, ".html"));
                    this.bookDict.set(fullpath, book);
                } else if (data.indexOf("<meta name=\"DC.contributor\"") > 0 && data.indexOf("content=\"BookEditor\"") > 0) {
                    let dom = new DOMParser().parseFromString(data, "text/html");
                    book = new EditorSavedBook(dom, path.basename(fullpath, ".html"));
                    this.bookDict.set(fullpath, book);
                }
            }
            if (!book) {
                ui.message("This is not a valid book");
            } else {
                this.showBook(book);
            }
        } catch (e) {
            console.error(e);
            ui.message(e.toString());
        }
    }

    clear() {
        let table = this.tocTable();
        table.deleteCaption();
        if (table.firstElementChild) {
            table.removeChild(table.firstElementChild);
        }
        this.setPreviewContent("");
        ui.clearMessage();
    }

    async save() {
        if (this.currentBook) {
            this.reorder(this.currentBook);
            return await this.saveHtmlBook(this.currentBook);
        } else {
            ui.message("Please select a book first");
        }
        return null;
    }

    async saveZipBook(book) {
        let file = new ZipBook(book);
        await file.saveTo(this.root);
        return file;
    }

    async saveHtmlBook(book) {
        let file = new HtmlBook(book);
        await file.saveTo(this.root);
        return file;
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
        this.showMeta(book);
        this.showToc(book.chapters);
    }

    setMeta(id, value) {
        if (value) {
            let meta = document.querySelector("input#book_" + id);
            if (meta) {
                meta.value = value;
            }
        }
    }

    showMeta(book) {
        this.setMeta("title", book.title);
        this.setMeta("author", book.authro);
        this.setMeta("date", book.date);
        this.setMeta("publisher", book.publisher);
        this.setMeta("tags", book.tags);
        this.setMeta("language", book.language);
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
            this.addTocButton(cell, "merge_type", this.mergeUp);
            if (chapter.indent) {
                this.addTocButton(cell, "format_indent_decrease", this.indentOutToc);
            } else {
                this.addTocButton(cell, "format_indent_increase", this.indentInToc);
            }
            this.addTocButton(cell, "vertical_align_top", this.moveFirst);
            this.addTocButton(cell, "vertical_align_bottom", this.moveLast);
        }
        dd.draggable(table);
    }

    moveFirst(id) {
        let cell = this.tocCell(id);
        let row = cell.parentNode;
        let table = this.tocTable();
        table.insertBefore(row, table.firstElementChild);
        cell.removeTocButton(cell, "merge_type");
    }

    moveLast(id) {
        let cell = this.tocCell(id);
        let row = cell.parentNode;
        let table = this.tocTable();
        table.insertBefore(row, null);
        this.addTocButton(cell, "merge_type", this.mergeUp);
    }

    mergeUp(id) {
        let cell = this.tocCell(id);
        let previousRow = cell.parentNode.previousElementSibling;
        if (previousRow) {
            let previousId = previousRow.firstElementChild.id;
            let chapter = this.currentBook.chapters.get(id);
            let previousChapter = this.currentBook.chapters.get(previousId);
            if (previousChapter) {
                previousChapter.content += "\r\n" + chapter.content;
                this.deleteToc(id);
            }
        }
    }

    indentOutToc(id) {
        let cell = this.tocCell(id);
        let indent = cell.classList.contains("indent");
        if (indent) {
            cell.classList.remove("indent");
            this.removeTocButton(cell, "format_indent_decrease");
            this.removeTocButton(cell, "merge_type");
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
            this.addTocButton(cell, "merge_type", this.mergeUp);
        }
    }

    removeTocButton(cell, name) {
        let btn = cell.querySelector("button[name='" + name + "']");
        if (btn)
            cell.removeChild(btn);
    }

    addTocButton(cell, name, fn) {
        let existing = cell.querySelector("button[name='" + name + "']");
        if (existing)
            return;
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
        this.currentBook.delete(id);
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
