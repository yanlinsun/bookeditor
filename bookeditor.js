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
            this.showBook(dom);
        });
    }

    showBook(dom) {
        let title = dom.querySelector("h1");
        this.showTitle(title);
        let toc = dom.querySelector("div.toc");
        this.showToc(toc);
    }

    showTitle(title) {
        let bookTitle = document.getElementById("book_title");
        bookTitle.innerText = title;
    }

    showToc(toc) {
        let table = document.getElementById("book_toc");
        Array.from(toc.querySelectorAll("tr")).forEach(tr => {
            let row = table.insertRow();
            let cell = row.insertCell();
            cell.classList.add("toc");
            let link = tr.cells[0].firstElementChild;
            cell.id = link.hash;
            if (link.parentNode.classList.contains("indent")) {
                cell.classList.add("indent");
            }
            cell.innerText = link.innerText;
            cell.onclick = this.selectToc;
        });
    }

    selectToc(id) {
        let cell = event.target;

        // unselect other toc
        let cells = cell.closest('table').querySelectorAll("td.selected");
        Array.from(cells).forEach(c => c.classList.remove("selected"));

        cell.classList.add("selected");
    }
}

module.exports = BookEditor;
