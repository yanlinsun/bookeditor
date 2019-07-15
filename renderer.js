
const BookEditor = require('./bookeditor');

let editor = null;

function init() {
    document.getElementById("book_file").onchange = readbook;
    document.getElementById("book_save").onclick = savebook;
}

function readbook() {
    let file = document.getElementById("book_file").files[0];
    if (editor) {
        editor.clear();
        editor = null;
    }
    editor = new BookEditor(file.path);
    document.getElementById("message").innerHTML = "";
}

function savebook() {
    if (editor) {
        editor.save();
    } else {
        document.getElementById("message").innerHTML = "Select a book first";
    }
}

init()
