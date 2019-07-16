'use strict';

const fs = require('fs');
const dd = require('./util/dragdrop.js');

class BookEditor {
    constructor(filename) {
        this.filename = filename;
        fs.readFile(filename, "utf-8", (err, data) => {
            if (err) {
                throw err;
            }

            let dom = new DOMParser().parseFromString(data, "text/html");
            this.book = dom;
            try {
                this.showBook(dom);
            } catch (err) {
                this.message("File not supported!");
                console.error(err);
            }
        });
    }

    message(msg) {
        document.getElementById("message").innerHTML = msg;
    }

    clear() {
        let table = this.tocTable();
        table.deleteCaption();
        if (table.firstElementChild) {
            table.removeChild(table.firstElementChild);
        }
        this.setPreviewContent("");
    }

    save() {
        this.reorder();
        let content = this.book.documentElement.outerHTML;
        fs.writeFile(this.filename, content, "utf-8", (err) => {
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

    showBook(dom) {
        let title = dom.querySelector("h1");
        if (title) {
            this.showTitle(title.innerHTML);
        }
        let toc = dom.querySelector("div.toc");
        this.showToc(toc);
    }

    showTitle(title) {
        let table = this.tocTable();
        let c = table.createCaption();
        c.innerHTML = title;
    }

    showToc(toc) {
        let table = this.tocTable();
        Array.from(toc.querySelectorAll("tr")).forEach(tr => {
            let row = table.insertRow();
            let cell = row.insertCell();
            cell.classList.add("toc");
            let link = tr.cells[0].querySelector("a");
            cell.id = link.hash.substring(1);
            let indent = link.parentNode.classList.contains("indent");
            if (indent) {
                cell.classList.add("indent");
            }
            cell.onclick = () => this.selectToc(cell.id);
            let c = document.createElement("SPAN");
            c.innerHTML = link.innerText;
            c.ondblclick = () => this.editToc(cell.id);
            cell.appendChild(c);
            this.addTocButton(cell, "delete", this.deleteToc);
            if (indent) {
                this.addTocButton(cell, "format_indent_decrease", this.indentOutToc);
            } else {
                this.addTocButton(cell, "format_indent_increase", this.indentInToc);
            }
        });
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
        let bookLink = this.book.querySelector("a[href='#" + id + "']");
        bookLink.innerText = value;
    }

    deleteToc(id) {
        let row = this.tocCell(id).parentNode;
        row.parentNode.removeChild(row);

        let bookLink = this.book.querySelector("a[href='#" + id + "']");
        let bookToc = bookLink.closest('tr');
        bookToc.parentNode.removeChild(bookToc);
        let content = this.book.querySelector("div[id='" + id + "']");
        content.parentNode.removeChild(content);
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
        let div = this.book.querySelector("div[id='" + id + "']");
        this.setPreviewContent(div.innerHTML);
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
