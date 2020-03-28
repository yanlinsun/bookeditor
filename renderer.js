const {dialog} = require('electron').remote;
const BookEditor = require('./bookeditor');

let editor = null;

function init() {
    document.getElementById("book_file").onclick = opendir;
    document.getElementById("book_save").onclick = savebook;
}

async function opendir() {
    let result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });
    if (Array.isArray(result) && result.length > 0) {
        editor = new BookEditor(result[0]);
    }
}

function savebook() {
    if (editor) {
        editor.save();
    } else {
        document.getElementById("message").innerHTML = "Select a book first";
    }
}

init()
