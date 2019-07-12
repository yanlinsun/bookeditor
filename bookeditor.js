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

    function showBook(dom) {
        let title = dom.querySelector("h1");
        showTitle(title);
        let toc = dom.querySelector("div.toc");
        showToc(toc);
    }

    function showTitle(title) {
        let bookTitle = document.getElementById("book_title");
        bookTitle.innerText = title;
    }

    function showToc(toc) {
        let table = document.getElementById("boot_toc");
        Array.from(toc.children).forEach(tr => {
            let row = table.insertRow();
            let cell = row.insertCell();
            cell.innerText = tr.firstChild.innerText;
            cell.id = tr.firstChild.firstChild.href;
            cell.className = "toc";
            cell.onclick = selectToc;
            cell.onmouseover = overToc;
            cell.onmouseleave = leaveToc;
        });
    }

    function selectToc(id) {
        let cell = event.target;

        // unselect other toc
        let cells = cell.cloest('table').querySelectorAll("td.selected");
        Array.from(cells).forEach(c => c.className = "toc");

        cell.className = "selected";
    }

    function overToc(e) {
        let cell = e.target;
        if (cell.className != "selected") {
            cell.className = "over_toc";
        }
    }

    function leaveToc(e) {
        let cell = e.target;
        if (cell.className != "selected") {
            cell.className = "toc";
        }
    }
}
