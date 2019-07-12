'use strict';

function init() {
    document.getElementById("book_file").onchange = readbook;
}

async function readbook(e) {
    let file = e.target.value;
    let book = await Util.readFile(file);
    if (book.indexOf('<meta name="generator" content="webscraper"></meta>') == -1) {
        throw new Error("Unsupported book");
    }
    let dom = new DOMParser().parseFromString(message.data, "text/html");
    showBook(dom);
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
