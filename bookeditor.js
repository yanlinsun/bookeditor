'use strict';

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
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
            ui.message("Saving book");
            this.updateBookMeta(this.currentBook);
            this.reorder(this.currentBook);
            let file = await this.saveHtmlBook(this.currentBook);
            if (file) {
                ui.message("Html Book saved. Converting to azw3");
                let filename = await this.convertAzw3(file.filename, file.filename.replace(path.extname(file.filename), ".azw3"));
                //file.delete();
                ui.message("Convert successful to " + filename);
            } else {
                ui.error("File save failed");
            }
        } else {
            ui.message("Please select a book first");
        }
        return null;
    }

    async convertAzw3(src, tgt) {
        let cmd = '"' + "/Applications/calibre.app/Contents/MacOS/ebook-convert" + '" "' + src + '" "' + tgt + '" --no-inline-toc --chapter-mark both --book-producer "EbookEditor" --language "zh_CN"';
        return await new Promise((resolve, reject) => {
            exec(cmd, (err, stdout, strerr) => {
                if (err) {
                    console.error(err);
                    ui.message(err, true);
                    reject(err);
                } else {
                    resolve(tgt);
                }
            })
        });
    }

    updateBookMeta(book) {
        book.title = document.querySelector("input#book_title").value;
        book.author = document.querySelector("input#book_author").value;
        book.date = document.querySelector("input#book_date").value;
        book.publisher = document.querySelector("input#book_publisher").value;
        book.tags = document.querySelector("input#book_tags").value;
        book.language = document.querySelector("input#book_language").value;
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
        Array.from(table.querySelectorAll("td:not(.ignore)"))
            .forEach(cell => orderedChapter.set(cell.id, cell.chapter));
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
            cell.chapter = chapter;
            cell.id = chapter.id;
            if (chapter.indent) {
                cell.classList.add("indent" + chapter.indent);
            }
            cell.onclick = () => this.selectToc(cell.id);
            let c = document.createElement("SPAN");
            c.innerHTML = chapter.title;
            c.ondblclick = () => this.editToc(cell.id);
            cell.appendChild(c);
            if (chapter.ignore) {
                cell.classList.add("hide");
                cell.classList.add("ignore");
                this.addTocButton(cell, "add", this.addToc);
            } else {
                this.addTocButton(cell, "delete", this.deleteToc);
            }
            this.addTocButton(cell, "merge_type", this.mergeUp);
            this.addTocButton(cell, "format_indent_decrease", this.indentDecreaseToc);
            this.addTocButton(cell, "format_indent_increase", this.indentIncreaseToc);
            this.addTocButton(cell, "vertical_align_top", this.moveFirst);
            this.addTocButton(cell, "vertical_align_bottom", this.moveLast);
        }
        dd.draggable(table);
    }

    perform(action) {
        switch (action) {
            case "save":
                return this.save();
            case "show_all":
                return this.showAll();
        }
        let id = this.getSelectedId();
        if (!id)
            return null;
        switch (action) {
            case "merge_up":
                this.mergeUp(id);
                break;
            case "move_first":
                this.moveFirst(id);
                break;
            case "move_last":
                this.moveLast(id);
                break;
            case "indent_increase":
                this.indentIncreaseToc();
                break;
            case "indent_decrease":
                this.indentDecreaseToc();
            default:
                break;
        }
    }

    showAll() {
        let btn = document.querySelector("#show_all");
        let table = this.tocTable();
        if (btn.showAll) {
            btn.innerText = "check_box_outline_blank";
            btn.showAll = false;
            let allrows = table.querySelectorAll("td");
            Array.from(allrows).map(td => td.chapter.ignore ? td.classList.add("hide") : "");
            btn.classList.add("pressed");
        } else {
            btn.innerText = "check_box";
            btn.showAll = true;
            let deleted = table.querySelectorAll("td.hide");
            if (deleted)
                Array.from(deleted).map(tr => tr.classList.remove("hide"));
            btn.classList.remove("pressed");
        }
    }

    getSelectedId() {
        let table = this.tocTable();
        let selected = table.querySelector("td.selected");
        if (selected) {
            return selected.id;
        }
        return null;
    }

    moveFirst(id) {
        let cell = this.tocCell(id);
        let row = cell.parentNode;
        let table = this.tocTable();
        if (table.firstElementChild.tagName == 'TBODY')
            table = table.firstElementChild;
        table.insertBefore(row, table.firstElementChild);
    }

    moveLast(id) {
        let cell = this.tocCell(id);
        let row = cell.parentNode;
        let table = this.tocTable();
        if (table.firstElementChild.tagName == 'TBODY')
            table = table.firstElementChild;
        table.insertBefore(row, null);
    }

    mergeUp(id) {
        let cell = this.tocCell(id);
        let previousRow = cell.parentNode.previousElementSibling;
        while (previousRow != null && previousRow.firstElementChild.chapter.ignore == true) {
            previousRow = previousRow.previousElementSibling;
        }
        if (previousRow) {
            let previousId = previousRow.firstElementChild.id;
            let previousChapter = this.currentBook.chapters.get(previousId);
            if (previousChapter) {
                previousChapter.content += "\n" + "<p>" + cell.chapter.title + "</p>\n" + cell.chapter.content;
                this.changeTocText(id, cell.chapter.title + " (merged)");
                this.deleteToc(id);
            }
        }
    }

    indentDecreaseToc() {
        this.indentToc(-1);
    }

    indentIncreaseToc() {
        this.indentToc(1);
    }

    indentToc(direction) {
        let cells = this.tocTable().querySelectorAll("td.selected");
        for (var cell of cells) {
            let indent = cell.chapter.indent;
            if (indent > 0) {
                cell.classList.remove("indent" + indent);
                indent += direction;
            }
            if (indent < 0) indent = 0;
            else if (indent > 2) indent = 2;
            if (indent == 0) {
                this.hideTocButton(cell, "format_indent_decrease");
                this.unhideTocButton(cell, "format_indent_increase");
            } else if (indent == 2) {
                this.hideTocButton(cell, "format_indent_increase");
                this.unhideTocButton(cell, "format_indent_decrease");
            } else {
                this.unhideTocButton(cell, "format_indent_increase");
                this.unhideTocButton(cell, "format_indent_decrease");
            }
            cell.chapter.indent = indent;
        }
    }

    hideTocButton(cell, name) {
        let btn = cell.querySelector("button[name='" + name + "']");
        if (btn)
            btn.classList.add("hide");
    }

    unhideTocButton(cell, name) {
        let btn = cell.querySelector("button[name='" + name + "']");
        if (btn)
            btn.classList.remove("hide");
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

    changeTocButton(cell, target, name, fn) {
        let btn = cell.querySelector("button[name='" + target + "']");
        if (btn)
            return;
        btn.name = name;
        btn.innerText = name;
        btn.onclick = () => {
            event.stopPropagation();
            fn.apply(this, [cell]);
        };
    }

    editToc(id) {
        let cell = this.tocCell(id);
        let text = cell.querySelector("SPAN");
        text.classList.add("hide");

        let input = cell.querySelector("input");
        if (input)
            input.classList.remove("hide");
        else {
            input = document.createElement("INPUT");
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
                    input.classList.add("hide");
                    text.classList.remove("hide");
                    e.preventDefault();
                } else if (e.key == "Home") {
                    input.setSelectionRange(0, 0);
                    e.preventDefault();
                } else if (e.key == "End") {
                    input.setSelectionRange(input.value.length, input.value.length);
                    e.preventDefault();
                }
            };
            input.onblur = e => {
                if (e.target.value != "") {
                    this.changeTocText(id, e.target.value);
                }
                input.classList.add("hide");
                text.classList.remove("hide");
            };
            cell.appendChild(input);
            input.focus();
        }
    }

    changeTocText(id, value) {
        let cell = this.tocCell(id);
        let text = cell.querySelector("SPAN");
        text.innerHTML = value;
        cell.chapter.title = value;
    }

    deleteToc(id) {
        let showAll = document.querySelector("#show_all").showAll;
        let cell = this.tocCell(id);
        cell.classList.add("ignore");
        if (!showAll)
            cell.classList.add("hide");
        cell.chapter.ignore = true;
        this.changeTocButton(cell, "delete", "add", this.addToc);
    }

    addToc(id) {
        let cell = this.tocCell(id);
        cell.classList.remove("ignore");
        cell.classList.remove("hide");
        cell.chapter.ignore = false;
        this.changeTocButton(cell, "add", "delete", this.deleteToc);
    }

    selectToc(id) {
        let table = this.tocTable();
        let cell = this.tocCell(id);
        let selected = Array.from(table.querySelectorAll("td.selected"));
        Array.from(selected).forEach(c => c.classList.remove("selected"));
        if (event.shiftKey && selected && selected.length > 0) {
            let i = cell.parentNode.rowIndex;
            let b = Math.min(i, selected[0].parentNode.rowIndex);
            let e = Math.max(i, selected[selected.length - 1].parentNode.rowIndex);
            for(; b <= e; b++)
                table.rows[b].firstElementChild.classList.add("selected");
        } else {
            // unselect other toc
            cell.classList.add("selected");
            this.showPreview(id);
        }
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
        return this.tocTable().querySelector("#" + id);
    }

    tocTable() {
        return document.getElementById("book_toc");
    }
}

module.exports = BookEditor;
