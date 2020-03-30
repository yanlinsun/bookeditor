
function message(msg, error) {
    let msgdiv = document.getElementById("message");
    msgdiv.innerHTML = msg;
    msgdiv.classList.remove("hide");
    if (error)
        msgdiv.classList.add("error");
    document.getElementById("book").classList.add("hide");
}

function clearMessage() {
    let msgdiv = document.getElementById("message");
    msgdiv.classList.remove("error");
    msgdiv.classList.add("hide");
    document.getElementById("book").classList.remove("hide");
}

module.exports = { message, clearMessage }
