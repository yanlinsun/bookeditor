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
            if (link.parentNode.classList.contains("indent")) {
                cell.classList.add("indent");
            }
            cell.onclick = () => this.selectToc(cell.id);
            let c = document.createElement("SPAN");
            c.innerHTML = link.innerText;
            cell.appendChild(c);
            c = document.createElement("INPUT");
            c.type = "button";
            c.value = "Delete";
            c.onclick = () => {
                event.stopPropagation();
                this.deleteToc(cell.id);
            };
            c.classList.add("button-primary");
            cell.appendChild(c);
        });
        dd.draggable(table);
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
