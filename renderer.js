
const BookEditor = require('./bookeditor');

function init() {
    document.getElementById("book_file").onchange = readbook;
}

function readbook() {
    let file = document.getElementById("book_file").files[0];
    let editor = new BookEditor(file.path);
}

init()
