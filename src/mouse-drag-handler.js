/**
 * @file
 *
 * Defines the {@link MouseDragHandler} class.
 *
 * @module mouse-drag-handler
 */

define(["konva"], function (Konva) {
  "use strict";

  function getMarkerObject(obj) {
    while (obj.parent !== null) {
      if (obj.parent instanceof Konva.Layer) {
        return obj;
      }

      obj = obj.parent;
    }

    return null;
  }

  /**
   * An object to receive callbacks on mouse drag events. Each function is
   * called with the current mouse X position, relative to the stage's
   * container HTML element.
   *
   * @typedef {Object} MouseDragHandlers
   * @global
   * @property {Function} onMouseDown Mouse down event handler.
   * @property {Function} onMouseMove Mouse move event handler.
   * @property {Function} onMouseUp Mouse up event handler.
   */

  /**
   * Creates a handler for mouse events to allow interaction with the waveform
   * views by clicking and dragging the mouse.
   *
   * @class
   * @alias MouseDragHandler
   *
   * @param {Konva.Stage} stage
   * @param {MouseDragHandlers} handlers
   */

  function MouseDragHandler(stage, handlers, options = {}) {
    this._stage = stage;
    this._handlers = handlers;
    this._dragging = false;
    this._options = options;
    this._mouseDown = this._mouseDown.bind(this);
    this._mouseUp = this._mouseUp.bind(this);
    this._mouseMove = this._mouseMove.bind(this);
    this._mouseWheel = this._mouseWheel.bind(this);
    this._contextMenu = this._contextMenu.bind(this);

    // TODO add to peaks.options
    this._handleDrag = false

    this._stage.on("mousedown", this._mouseDown);
    this._stage.on("touchstart", this._mouseDown);

    this._stage.on("contextmenu", this._contextMenu);

    this._mouseDownClientX = null;
    this._mouseDownClientY = null;

    stage.container().addEventListener("wheel", this._mouseWheel, false);
  }

  MouseDragHandler.prototype._contextMenu = function (event) {
    if (this._options.preventContextMenu) {
      event.evt.preventDefault();
      return false;
    }
  };

  /**
   * Mouse down event handler.
   *
   * @param {MouseEvent} event
   */

  MouseDragHandler.prototype._mouseDown = function (event) {
    if (this.__handleDrag) {
      var marker = getMarkerObject(event.target);

      // Avoid interfering with drag/drop of point and segment markers.
      if (marker && marker.attrs.draggable) {
        return;
      }
    }

    if (event.type === "touchstart") {
      this._mouseDownClientX = Math.floor(event.evt.touches[0].clientX);
      this._mouseDownClientY = Math.floor(event.evt.touches[0].clientY);
    } else {
      this._mouseDownClientX = event.evt.clientX;
      this._mouseDownClientY = event.evt.clientY;
    }

    if (this._handlers.onMouseDown) {
      var mouseDownPosX = this._getMousePosX(this._mouseDownClientX);
      var mouseDownPosY = this._getMousePosY(event.evt.clientY);

      this._handlers.onMouseDown(mouseDownPosX, mouseDownPosY, event);
    }

    // Use the window mousemove and mouseup handlers instead of the
    // Konva.Stage ones so that we still receive events if the user moves the
    // mouse outside the stage.
    window.addEventListener("mousemove", this._mouseMove, false);
    window.addEventListener("touchmove", this._mouseMove, false);
    window.addEventListener("mouseup", this._mouseUp, false);
    window.addEventListener("touchend", this._mouseUp, false);
    window.addEventListener("blur", this._mouseUp, false);
  };

  /**
   * Mouse wheel event handler.
   *
   * @param {MouseEvent} event
   */
  MouseDragHandler.prototype._mouseWheel = function (event) {
    if (this._handlers.onMouseWheel) {
      this._handlers.onMouseWheel(event);
    }
  };

  /**
   * Mouse move event handler.
   *
   * @param {MouseEvent} event
   */

  MouseDragHandler.prototype._mouseMove = function (event) {
    var clientX = null;
    var clientY = null;

    if (event.type === "touchmove") {
      clientX = Math.floor(event.changedTouches[0].clientX);
      clientY = Math.floor(event.changedTouches[0].clientY);
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    // Don't update on vertical mouse movement.
    // if (clientX === this._mouseDownClientX) {
    //   return;
    // }

    const delta = Math.sqrt(Math.pow(clientX - this._mouseDownClientX, 2) + Math.pow(clientY - this._mouseDownClientY, 2));

    // TODO This "3" is in accordance with START_DRAG_DELTA in deepdubapp,
    // instead of hard-coding it, pass it through options.
    //
    if (delta > 3) {
      this._dragging = true;
    }

    if (this._handlers.onMouseMove) {
      var mousePosX = this._getMousePosX(clientX);
      var mousePosY = this._getMousePosY(clientY);

      // FIXME this might cause an issue?
      // This line was in the base, while the uncommented line appears in the
      // fork branch.
      //
      // this._handlers.onMouseMove(mousePosX);
      this._handlers.onMouseMove(event.type, mousePosX, mousePosY, event);
    }
  };

  /**
   * Mouse up event handler.
   *
   * @param {MouseEvent} event
   */

  MouseDragHandler.prototype._mouseUp = function (event) {
    var clientX = null;
    var clientY = null;

    if (event.type === "touchend") {
      clientX = Math.floor(event.changedTouches[0].clientX);
      clientY = Math.floor(event.changedTouches[0].clientY);
      if (event.cancelable) {
        event.preventDefault();
      }
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    if (this._handlers.onMouseUp) {
      var mousePosX = this._getMousePosX(clientX);
      var mousePosY = this._getMousePosY(clientY);

      this._handlers.onMouseUp(mousePosX, mousePosY, event);
    }

    window.removeEventListener("mousemove", this._mouseMove, false);
    window.removeEventListener("touchmove", this._mouseMove, false);
    window.removeEventListener("mouseup", this._mouseUp, false);
    window.removeEventListener("touchend", this._mouseUp, false);
    window.removeEventListener("blur", this._mouseUp, false);

    this._dragging = false;
  };

  /**
   * @returns {Number} The mouse X position, relative to the container that
   * received the mouse down event.
   *
   * @private
   * @param {Number} clientX Mouse client X position.
   */

  MouseDragHandler.prototype._getMousePosX = function (clientX) {
    var containerPos = this._stage.getContainer().getBoundingClientRect();

    return clientX - containerPos.left;
  };

  MouseDragHandler.prototype._getMousePosY = function (clientY) {
    var containerPos = this._stage.getContainer().getBoundingClientRect();

    return clientY - containerPos.top;
  };

  /**
   * Returns <code>true</code> if the mouse is being dragged, i.e., moved with
   * the mouse button held down.
   *
   * @returns {Boolean}
   */

  MouseDragHandler.prototype.isDragging = function () {
    return this._dragging;
  };

  return MouseDragHandler;
});
