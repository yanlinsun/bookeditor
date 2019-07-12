
const BookEditor = require('./bookeditor.js');

function init() {
    document.getElementById("book_file").onchange = readbook;
}

function readbook() {
    let editor = new BookEditor(document.getElementById("book_file").value);
}

init();
