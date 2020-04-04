
function message(msg, error) {
    let msgdiv = document.getElementById("message");
    msgdiv.innerHTML = msg;
    msgdiv.classList.remove("hide");
    if (error)
        msgdiv.classList.add("error");
}

function error(msg) {
    message(msg, error);
}

function clearMessage() {
    let msgdiv = document.getElementById("message");
    msgdiv.classList.remove("error");
    msgdiv.classList.add("hide");
}

module.exports = { message, clearMessage, error }
