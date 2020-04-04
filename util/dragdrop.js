'use strict';

const DD = {
    draggable: function(o) {
        if (o instanceof Array || o instanceof HTMLCollection) {
            for (let i = 0; i < o.length; i++) {
                DD.draggable(o[i]);
            }
        } else if (o instanceof HTMLElement) {
            o.__dd_droppable = true;
            o.__dd_draggable = true;
            o.draggable = true;
            o.ondragstart = DD._DragStart;
            DD.draggable(o.children);
        }
    },

    droppable: function(o) {
        o.__dd_droppable = true;
    },

    _GetDraggingTarget : function(e, excludes) {
        let objs = document.elementsFromPoint(e.x, e.y);
        let row = null;
        if (objs)
            row = objs[0];
        if (!row) return null;
        while (row.tagName !== "TR" && row.parentNode) {
            if (row.tagName == "INPUT" && row.type == "text")
                return null;
            row = row.parentNode;
        }
        if (!row.__dd_draggable || row.tagName !== "TR") {
            throw new Error("Not a recognized draggable object: " + row.outerHTML);
        }
        return row;
    },

    _GetDroppableTarget : function(e) {
        let objs = document.elementsFromPoint(e.x, e.y);
        let obj = null;
        let excludes = [ document.__dd_dragging, document.__dd_placeholder ];
        let found = false;
        for (let i = 0; i < objs.length; i++) {
            obj = objs[i];
            // no TR is returned from document.elementsFromPoint
            if (obj.tagName === "TD") {
                obj = obj.parentNode;
            }
            if (obj.__dd_droppable === true) {
                if (excludes.indexOf(obj) === -1) {
                    found = true;
                    break;
                }
            }
        }
        if (found) {
            return obj;
        } else {
            return null;
        }
    },

    _MovePlaceHolder: function(e) {
        let placeHolder = document.__dd_placeholder;
        let pos = placeHolder.getBoundingClientRect();
        placeHolder.style.top = pos.y + e.movementY + document.defaultView.scrollY + "px";
        placeHolder.style.left = pos.x + e.movementX + document.defaultView.scrollX + "px";
        DD._DragOver(e);
    },

    _DragStart: function(e) {
        e.stopPropagation();
        e.preventDefault();
        let obj = DD._GetDraggingTarget(e);
        if (!obj) {
            return;
        }
        document.__dd_dragging = obj;
        if (obj.tagName === "TR") {
            let row = obj;
            let table = row.parentNode;
            let pos = row.getBoundingClientRect();
            let idx = Array.from(table.rows).indexOf(row);
            let placeHolder = table.insertRow(idx);
            placeHolder.innerHTML = row.innerHTML;
            placeHolder.style.backgroundColor = row.style.backgroundColor;
            placeHolder.style.position = "absolute";
            placeHolder.style.top = pos.top + document.defaultView.scrollY + "px";
            placeHolder.style.left = pos.left + document.defaultView.scrollX + "px";
            placeHolder.style.width = pos.width + "px";
            placeHolder.style.height = pos.height + "px";
            placeHolder.draggable = true;
            placeHolder.style.zIndex = 1000;
            placeHolder.cells[0].style.width = "inherit"; // to fill up space
            row.style.visibility = "hidden";
            document.__dd_placeholder = placeHolder;
        }
        document.onmouseup = DD._Drop;
        document.onmousemove = DD._MovePlaceHolder;
    },

    _Drop : function(e) {
        let dragging = document.__dd_dragging;
        if (dragging.tagName === "TR") {
            dragging.style.visibility = "visible";
        }
        let target = DD._GetDroppableTarget(e);
        if (target) {
            if (target.tagName === "INPUT" && target.type === "TEXT") {
                target.style.color = target.originalColor;
                target.__dd_dragging_over = false;
            }
        }
        DD._DragEnd(e);
    },

    _DragEnd : function(e) {
        let dragging = document.__dd_dragging;
        if (document.__dd_placeholder) {
            if (dragging.tagName === "TR") {
                let table = dragging.parentNode;
                let placeHolder = document.__dd_placeholder;
                let idx = Array.from(table.rows).indexOf(placeHolder);
                table.deleteRow(idx);
            }
        }
        
        document.__dd_placeholder = null;
        document.__dd_dragging = null;
        document.onmousemove = null;
        document.onmouseup = null;
    },

    _DragOverTR : function(row) {
        let dragRow = document.__dd_dragging;
        let table = dragRow.parentNode;
        if (table !== row.parentNode) {
            return;
        }
        let placeHolder = document.__dd_placeholder;
        let pos = row.getBoundingClientRect();
        let phPos = placeHolder.getBoundingClientRect();
        if (phPos.bottom > pos.bottom) {
            if (pos.bottom - phPos.top > phPos.top - pos.top) {
                if (row.previousElementSibling) {
                    if (row.previousElementSibling !== dragRow) {
                        table.insertBefore(dragRow, row);
                    }
                } else {
                    table.insertBefore(dragRow, table.rows[0]);
                }
            }
        } else if (phPos.top < pos.top) {
            if (pos.bottom - phPos.bottom < phPos.bottom - pos.top) {
                if (row.nextElementSibling) {
                    if (row.nextElementSibling !== dragRow) {
                        table.insertBefore(dragRow, row.nextElementSibling);
                    }
                } else {
                    table.insertBefore(dragRow, null);
                }
            }
        }
    },

    _DragOverInputText : function(input) {
        let dragging = document.__dd_placeholder;
        if (!input.__dd_dragging_over) {
            input.originalColor = input.style.color;
            input.__dd_dragging_over = true;
        }
        input.value = dragging.innerText;
    },

    _DragOut : function(obj) {
        if (!obj) {
            return;
        }
        switch(obj.tagName) {
            case "TBODY":
                let table = obj;
                table.insertBefore(document.__dd_dragging, document.__dd_placeholder);
                break;
            case "INPUT":
                if (obj.type === "text") {
                    obj.value = "";
                }
                break;
        }
        document.__dd_dragging_over = null;
    },

    _DragOver: function(e) {
        let target = DD._GetDroppableTarget(e);
        if (!target) {
            if (document.__dd_dragging_over) {
                DD._DragOut(document.__dd_dragging_over);
            }
            return;
        }
        switch(target.tagName) {
            case "TABLE":
                if (Array.from(target.children).indexOf(document.__dd_dragging_over) === -1) {
                    DD._DragOut(document.__dd_dragging_over);
                }
                break;
            case "TR":
                if (target.parentNode !== document.__dd_dragging_over) {
                    DD._DragOut(document.__dd_dragging_over);
                }
                DD._DragOverTR(target);
                document.__dd_dragging_over = target.parentNode;
                break;
            case "INPUT":
                if (target !== document.__dd_dragging_over) {
                    DD._DragOut(document.__dd_dragging_over);
                }
                if (target.type === "text") {
                    DD._DragOverInputText(target);
                }
                break;
        }
        if (!document.__dd_dragging_over) {
            document.__dd_dragging_over = target;
        }
    }
};

module.exports = DD;
