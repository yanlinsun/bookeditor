'use strict';

const fs = require('fs');

class BookEditor {
    constructor(filename) {
        this.filename = filename;
        fs.readFile(filename, "utf-8", (err, data) => {
            if (err) {
                throw err;
            }

            let dom = new DOMParser().parseFromString(data, "text/html");
            this.book = dom;
            this.showBook(dom);
        });
    }

    clear() {
        let table = this.tocTable();
        table.deleteCaption();
        table.removeChild(table.firstElementChild);
    }

    save() {
        let content = this.book.documentElement.outerHTML;
        fs.writeFile(this.filename, content, "utf-8", (err) => {
            if (err) {
                console.error(err);
                document.getElementById("message").innerHTML = err.toString();
            } else {
                document.getElementById("message").innerHTML = "File saved!";
            }
        });
    }

    showBook(dom) {
        let title = dom.querySelector("h1");
        this.showTitle(title.innerHTML);
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
            let link = tr.cells[0].firstElementChild;
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
            cell.appendChild(c);
        });
    }

    deleteToc(id) {
        let cell = this.tocCell(id);
        cell.parentNode.removeChild(cell);

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
        let preview = document.getElementById("preview_container");
        let content = this.book.querySelector("div[id='" + id + "']");
        preview.innerHTML = content.innerHTML;
    }

    tocCell(id) {
        return this.tocTable().querySelector("td[id='" + id + "']");
    }

    tocTable() {
        return document.getElementById("book_toc");
    }
}

module.exports = BookEditor;
