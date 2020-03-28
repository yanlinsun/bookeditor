
class Book {
    constructor(dom, title) {
        this.title = this.parseTitle(dom, title);
        this.chapters = new Map();
        this.parseChapters(dom);
    }


    parseTitle(dom, defaultTitle) {
        let title = dom.querySelector("h1");
        if (title) {
            return title;
        } else {
            return defaultTitle;
        }
    }

    parseChapters(dom) {
        let tocdiv = dom.querySelector("div.toc");
        Array.from(tocdiv.querySelectorAll("tr")).forEach(tr => {
            let link = tr.cells[0].querySelector("a");
            if (link) {
                let t = {};
                t.id = link.hash.substring(1);
                t.indent = link.parentNode.classList.contains("indent");
                t.title = link.innerText;
                let div = dom.querySelector("div[id='" + t.id + "']");
                t.content = div.innerHTML;
                this.chapters.set(t.id, t);
            }
        });
    }
}

module.exports = Book;
